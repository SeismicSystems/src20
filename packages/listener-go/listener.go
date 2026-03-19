package main

import (
	"context"
	"crypto/cipher"
	"fmt"
	"listener-go/util"
	"math/big"
	"os"
	"sync"

	"github.com/SeismicSystems/aes"
	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

// attachEventListener subscribes to live Transfer and Approval events via WebSocket.
func attachEventListener(client *ethclient.Client, aesKey []byte, contractAddress string) {
	keyHash := aes.Keccak256Hash(aesKey)
	aesGcm, err := aes.CreateAESGCM(aesKey)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: Failed to create AES GCM: %v\n", err)
		os.Exit(1)
	}

	SRC20Abi := util.ParseABI()

	var addresses []common.Address
	if contractAddress != "" {
		addresses = []common.Address{common.HexToAddress(contractAddress)}
	}

	var wg sync.WaitGroup
	wg.Add(2)

	// Event listener for Transfer
	go func() {
		defer wg.Done()
		transferEventID := SRC20Abi.Events["Transfer"].ID
		sub, logs := subscribeToEvent(client, addresses, transferEventID, keyHash)
		if sub == nil {
			return
		}
		defer sub.Unsubscribe()

		for {
			select {
			case err := <-sub.Err():
				fmt.Fprintf(os.Stderr, "Error subscribing to Transfer: %v\n", err)
				return
			case vLog := <-logs:
				handleTransferEvent(SRC20Abi, vLog, aesGcm)
			}
		}
	}()

	// Event listener for Approval
	go func() {
		defer wg.Done()
		approvalEventID := SRC20Abi.Events["Approval"].ID
		sub, logs := subscribeToEvent(client, addresses, approvalEventID, keyHash)
		if sub == nil {
			return
		}
		defer sub.Unsubscribe()

		for {
			select {
			case err := <-sub.Err():
				fmt.Fprintf(os.Stderr, "Error subscribing to Approval: %v\n", err)
				return
			case vLog := <-logs:
				handleApprovalEvent(SRC20Abi, vLog, aesGcm)
			}
		}
	}()

	wg.Wait()
}

// queryBlockRange fetches historical Transfer and Approval events from a block range.
func queryBlockRange(client *ethclient.Client, aesKey []byte, contractAddress string, fromBlock int64, toBlock int64) {
	keyHash := aes.Keccak256Hash(aesKey)
	aesGcm, err := aes.CreateAESGCM(aesKey)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: Failed to create AES GCM: %v\n", err)
		os.Exit(1)
	}

	SRC20Abi := util.ParseABI()
	transferEventID := SRC20Abi.Events["Transfer"].ID
	approvalEventID := SRC20Abi.Events["Approval"].ID

	var addresses []common.Address
	if contractAddress != "" {
		addresses = []common.Address{common.HexToAddress(contractAddress)}
	}

	// Build filter query — match both Transfer and Approval events with our keyHash
	query := ethereum.FilterQuery{
		FromBlock: big.NewInt(fromBlock),
		Addresses: addresses,
		Topics: [][]common.Hash{
			{transferEventID, approvalEventID}, // match either event
			{},                                 // from/owner (any)
			{},                                 // to/spender (any)
			{keyHash},                          // encryptKeyHash must match our key
		},
	}

	if toBlock >= 0 {
		query.ToBlock = big.NewInt(toBlock)
	}
	// nil ToBlock = latest

	logs, err := client.FilterLogs(context.Background(), query)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to filter logs: %v\n", err)
		os.Exit(1)
	}

	if len(logs) == 0 {
		fmt.Println("No matching events found in the specified block range.")
		return
	}

	fmt.Printf("Found %d event(s)\n\n", len(logs))

	for _, vLog := range logs {
		fmt.Printf("--- Block %d | Tx %s | LogIndex %d ---\n", vLog.BlockNumber, vLog.TxHash.Hex(), vLog.Index)

		eventTopic := vLog.Topics[0]
		switch eventTopic {
		case transferEventID:
			handleTransferEvent(SRC20Abi, vLog, aesGcm)
		case approvalEventID:
			handleApprovalEvent(SRC20Abi, vLog, aesGcm)
		default:
			fmt.Fprintf(os.Stderr, "  Unknown event topic: %s\n\n", eventTopic.Hex())
		}
	}
}

func subscribeToEvent(client *ethclient.Client, addresses []common.Address, eventID common.Hash, keyHash common.Hash) (ethereum.Subscription, chan types.Log) {
	query := ethereum.FilterQuery{
		Addresses: addresses,
		Topics: [][]common.Hash{
			{eventID},
			{},
			{},
			{keyHash},
		},
	}
	logs := make(chan types.Log)
	sub, err := client.SubscribeFilterLogs(context.Background(), query, logs)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to subscribe to logs: %v\n", err)
		return nil, nil
	}
	return sub, logs
}

func handleTransferEvent(SRC20Abi *abi.ABI, vLog types.Log, aesGcm cipher.AEAD) {
	from := common.BytesToAddress(vLog.Topics[1].Bytes())
	to := common.BytesToAddress(vLog.Topics[2].Bytes())
	encryptKeyHash := vLog.Topics[3]

	// Check for the zero-hash / empty-data case (recipient has no registered key)
	if encryptKeyHash == (common.Hash{}) {
		fmt.Printf(
			"Transfer (recipient has no key — amount unknown)\n\n"+
				"    from: %s\n"+
				"    to: %s\n"+
				"    encryptKeyHash: %s\n"+
				"    encryptedAmount: (empty)\n\n",
			from, to, encryptKeyHash.Hex(),
		)
		return
	}

	var transferEvent struct {
		EncryptedAmount []byte
	}
	err := SRC20Abi.UnpackIntoInterface(&transferEvent, "Transfer", vLog.Data)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to unpack Transfer event: %v\n", err)
		return
	}

	// Handle empty encryptedAmount
	if len(transferEvent.EncryptedAmount) == 0 {
		fmt.Printf(
			"Transfer (empty encryptedAmount)\n\n"+
				"    from: %s\n"+
				"    to: %s\n"+
				"    encryptKeyHash: %s\n"+
				"    encryptedAmount: (empty)\n\n",
			from, to, encryptKeyHash.Hex(),
		)
		return
	}

	amount, err := aes.DecryptAESGCM(transferEvent.EncryptedAmount, aesGcm)
	if err != nil {
		fmt.Fprintf(os.Stderr,
			"Failed to decrypt Transfer (block %d, tx %s): %v\n"+
				"    from: %s\n"+
				"    to: %s\n"+
				"    encryptKeyHash: %s\n"+
				"    encryptedAmount (%d bytes): 0x%x\n\n",
			vLog.BlockNumber, vLog.TxHash.Hex(), err,
			from, to, encryptKeyHash.Hex(),
			len(transferEvent.EncryptedAmount), transferEvent.EncryptedAmount,
		)
		return
	}

	fmt.Printf(
		"Transfer\n\n"+
			"    from: %s\n"+
			"    to: %s\n"+
			"    amount: %s\n\n",
		from, to,
		amount,
	)
}

func handleApprovalEvent(SRC20Abi *abi.ABI, vLog types.Log, aesGcm cipher.AEAD) {
	owner := common.BytesToAddress(vLog.Topics[1].Bytes())
	spender := common.BytesToAddress(vLog.Topics[2].Bytes())
	encryptKeyHash := vLog.Topics[3]

	// Check for the zero-hash / empty-data case (spender has no registered key)
	if encryptKeyHash == (common.Hash{}) {
		fmt.Printf(
			"Approval (spender has no key — amount unknown)\n\n"+
				"    owner: %s\n"+
				"    spender: %s\n"+
				"    encryptKeyHash: %s\n"+
				"    encryptedAmount: (empty)\n\n",
			owner, spender, encryptKeyHash.Hex(),
		)
		return
	}

	var approvalEvent struct {
		EncryptedAmount []byte
	}
	err := SRC20Abi.UnpackIntoInterface(&approvalEvent, "Approval", vLog.Data)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to unpack Approval event: %v\n", err)
		return
	}

	// Handle empty encryptedAmount
	if len(approvalEvent.EncryptedAmount) == 0 {
		fmt.Printf(
			"Approval (empty encryptedAmount)\n\n"+
				"    owner: %s\n"+
				"    spender: %s\n"+
				"    encryptKeyHash: %s\n"+
				"    encryptedAmount: (empty)\n\n",
			owner, spender, encryptKeyHash.Hex(),
		)
		return
	}

	amount, err := aes.DecryptAESGCM(approvalEvent.EncryptedAmount, aesGcm)
	if err != nil {
		fmt.Fprintf(os.Stderr,
			"Failed to decrypt Approval (block %d, tx %s): %v\n"+
				"    owner: %s\n"+
				"    spender: %s\n"+
				"    encryptKeyHash: %s\n"+
				"    encryptedAmount (%d bytes): 0x%x\n\n",
			vLog.BlockNumber, vLog.TxHash.Hex(), err,
			owner, spender, encryptKeyHash.Hex(),
			len(approvalEvent.EncryptedAmount), approvalEvent.EncryptedAmount,
		)
		return
	}

	fmt.Printf(
		"Approval\n\n"+
			"    owner: %s\n"+
			"    spender: %s\n"+
			"    amount: %s\n\n",
		owner, spender,
		amount,
	)
}
