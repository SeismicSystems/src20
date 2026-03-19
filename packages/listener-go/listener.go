package main

import (
	"context"
	"crypto/cipher"
	"encoding/hex"
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

type ListenerOpts struct {
	NoKeyHash bool // if true, do NOT filter by encryptKeyHash in Topics[3]
}

// attachEventListener subscribes to live Transfer and Approval events via WebSocket.
func attachEventListener(client *ethclient.Client, aesKey []byte, contractAddress string, opts ListenerOpts) {
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
		sub, logs := subscribeToEvent(client, addresses, transferEventID, keyHash, opts)
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
		sub, logs := subscribeToEvent(client, addresses, approvalEventID, keyHash, opts)
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
func queryBlockRange(client *ethclient.Client, aesKey []byte, contractAddress string, fromBlock int64, toBlock int64, opts ListenerOpts) {
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

	// Build filter query
	var topics [][]common.Hash
	if opts.NoKeyHash {
		// CipherOwl's approach: only filter on event signature, no keyHash filter
		topics = [][]common.Hash{
			{transferEventID, approvalEventID},
		}
	} else {
		topics = [][]common.Hash{
			{transferEventID, approvalEventID}, // match either event
			{},                                 // from/owner (any)
			{},                                 // to/spender (any)
			{keyHash},                          // encryptKeyHash must match our key
		}
	}

	query := ethereum.FilterQuery{
		FromBlock: big.NewInt(fromBlock),
		Addresses: addresses,
		Topics:    topics,
	}

	if toBlock >= 0 {
		query.ToBlock = big.NewInt(toBlock)
	}

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

func subscribeToEvent(client *ethclient.Client, addresses []common.Address, eventID common.Hash, keyHash common.Hash, opts ListenerOpts) (ethereum.Subscription, chan types.Log) {
	var topics [][]common.Hash
	if opts.NoKeyHash {
		topics = [][]common.Hash{
			{eventID},
		}
	} else {
		topics = [][]common.Hash{
			{eventID},
			{},
			{},
			{keyHash},
		}
	}

	query := ethereum.FilterQuery{
		Addresses: addresses,
		Topics:    topics,
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
			"[EMPTY] Transfer — recipient has no registered key, encryptedAmount is empty\n\n"+
				"    from:            %s\n"+
				"    to:              %s\n"+
				"    encryptKeyHash:  %s (zero hash)\n"+
				"    encryptedAmount: (empty)\n"+
				"    diagnosis:       This is the recipient-notification event. The recipient\n"+
				"                     has no AES key in the Directory contract, so the contract\n"+
				"                     emits bytes32(0) and bytes(\"\"). This event cannot be\n"+
				"                     decrypted by anyone. Filter by your keyHash to skip it.\n\n",
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

	// Handle empty encryptedAmount with non-zero keyHash
	if len(transferEvent.EncryptedAmount) == 0 {
		fmt.Printf(
			"[EMPTY] Transfer — non-zero keyHash but empty encryptedAmount\n\n"+
				"    from:            %s\n"+
				"    to:              %s\n"+
				"    encryptKeyHash:  %s\n"+
				"    encryptedAmount: (empty)\n\n",
			from, to, encryptKeyHash.Hex(),
		)
		return
	}

	amount, err := aes.DecryptAESGCM(transferEvent.EncryptedAmount, aesGcm)
	if err != nil {
		fmt.Printf(
			"[DECRYPT FAILED] Transfer — encryptedAmount present but decryption failed\n\n"+
				"    from:            %s\n"+
				"    to:              %s\n"+
				"    encryptKeyHash:  %s\n"+
				"    encryptedAmount: 0x%s (%d bytes)\n"+
				"    error:           %v\n"+
				"    diagnosis:       This event is encrypted with a DIFFERENT key (likely the\n"+
				"                     recipient's personal AES key from the Directory contract).\n"+
				"                     Your intelligence key cannot decrypt it. Filter by your\n"+
				"                     keyHash to skip it.\n\n",
			from, to, encryptKeyHash.Hex(),
			hex.EncodeToString(transferEvent.EncryptedAmount), len(transferEvent.EncryptedAmount),
			err,
		)
		return
	}

	fmt.Printf(
		"[OK] Transfer — decrypted successfully\n\n"+
			"    from:            %s\n"+
			"    to:              %s\n"+
			"    encryptKeyHash:  %s\n"+
			"    amount:          %s\n\n",
		from, to, encryptKeyHash.Hex(),
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
			"[EMPTY] Approval — spender has no registered key, encryptedAmount is empty\n\n"+
				"    owner:           %s\n"+
				"    spender:         %s\n"+
				"    encryptKeyHash:  %s (zero hash)\n"+
				"    encryptedAmount: (empty)\n"+
				"    diagnosis:       This is the spender-notification event. The spender\n"+
				"                     has no AES key in the Directory contract. Filter by\n"+
				"                     your keyHash to skip it.\n\n",
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

	// Handle empty encryptedAmount with non-zero keyHash
	if len(approvalEvent.EncryptedAmount) == 0 {
		fmt.Printf(
			"[EMPTY] Approval — non-zero keyHash but empty encryptedAmount\n\n"+
				"    owner:           %s\n"+
				"    spender:         %s\n"+
				"    encryptKeyHash:  %s\n"+
				"    encryptedAmount: (empty)\n\n",
			owner, spender, encryptKeyHash.Hex(),
		)
		return
	}

	amount, err := aes.DecryptAESGCM(approvalEvent.EncryptedAmount, aesGcm)
	if err != nil {
		fmt.Printf(
			"[DECRYPT FAILED] Approval — encryptedAmount present but decryption failed\n\n"+
				"    owner:           %s\n"+
				"    spender:         %s\n"+
				"    encryptKeyHash:  %s\n"+
				"    encryptedAmount: 0x%s (%d bytes)\n"+
				"    error:           %v\n"+
				"    diagnosis:       This event is encrypted with a DIFFERENT key (likely the\n"+
				"                     spender's personal AES key). Filter by your keyHash to\n"+
				"                     skip it.\n\n",
			owner, spender, encryptKeyHash.Hex(),
			hex.EncodeToString(approvalEvent.EncryptedAmount), len(approvalEvent.EncryptedAmount),
			err,
		)
		return
	}

	fmt.Printf(
		"[OK] Approval — decrypted successfully\n\n"+
			"    owner:           %s\n"+
			"    spender:         %s\n"+
			"    encryptKeyHash:  %s\n"+
			"    amount:          %s\n\n",
		owner, spender, encryptKeyHash.Hex(),
		amount,
	)
}
