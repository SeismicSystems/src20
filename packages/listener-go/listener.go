package main

import (
	"context"
	"crypto/cipher"
	"fmt"
	"listener-go/util"
	"os"
	"sync"

	"github.com/SeismicSystems/aes"
	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

func attachEventListener(client *ethclient.Client, aesKey []byte) {
	keyHash := aes.Keccak256Hash(aesKey)
	aesGcm, err := aes.CreateAESGCM(aesKey)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: Failed to create AES GCM: %v\n", err)
		os.Exit(1)
	}

	SRC20Abi := util.ParseABI()
	src20Address := common.HexToAddress(util.LoadSRC20Address())

	var wg sync.WaitGroup
	wg.Add(2)

	// Event listener for Transfer
	go func() {
		defer wg.Done()
		transferEventID := SRC20Abi.Events["Transfer"].ID
		sub, logs := subscribeToEvent(client, src20Address, transferEventID, keyHash)
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
		sub, logs := subscribeToEvent(client, src20Address, approvalEventID, keyHash)
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

func subscribeToEvent(client *ethclient.Client, src20Address common.Address, eventID common.Hash, keyHash common.Hash) (ethereum.Subscription, chan types.Log) {
	query := ethereum.FilterQuery{
		Addresses: []common.Address{src20Address},
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
	var transferEvent struct {
		From            common.Address
		To              common.Address
		EncryptedAmount []byte
	}
	err := SRC20Abi.UnpackIntoInterface(&transferEvent, "Transfer", vLog.Data)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to unpack Transfer event: %v\n", err)
		return
	}

	transferEvent.From = common.BytesToAddress(vLog.Topics[1].Bytes())
	transferEvent.To = common.BytesToAddress(vLog.Topics[2].Bytes())
	amount, err := aes.DecryptAESGCM(transferEvent.EncryptedAmount, aesGcm)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to decrypt Transfer event: %v\n", err)
		return
	}

	fmt.Printf(
		"Transfer(address from, address to, uint256 amount)\n\n"+
			"    from: %s\n"+
			"    to: %s\n"+
			"    amount: %d\n\n",
		transferEvent.From,
		transferEvent.To,
		amount,
	)
}

func handleApprovalEvent(SRC20Abi *abi.ABI, vLog types.Log, aesGcm cipher.AEAD) {
	var approvalEvent struct {
		Owner           common.Address
		Spender         common.Address
		EncryptedAmount []byte
	}
	err := SRC20Abi.UnpackIntoInterface(&approvalEvent, "Approval", vLog.Data)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to unpack Approval event: %v\n", err)
		return
	}

	approvalEvent.Owner = common.BytesToAddress(vLog.Topics[1].Bytes())
	approvalEvent.Spender = common.BytesToAddress(vLog.Topics[2].Bytes())
	amount, err := aes.DecryptAESGCM(approvalEvent.EncryptedAmount, aesGcm)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to decrypt Approval event: %v\n", err)
		return
	}

	fmt.Printf(
		"Approval(address owner, address spender, uint256 amount)\n\n"+
			"    owner: %s\n"+
			"    spender: %s\n"+
			"    amount: %d\n\n",
		approvalEvent.Owner,
		approvalEvent.Spender,
		amount,
	)
}
