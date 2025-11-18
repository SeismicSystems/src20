package main

import (
	"context"
	"crypto/cipher"
	"fmt"
	"listener-go/util"
	"os"
	"strings"
	"sync"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

func AttachEventListener(client *ethclient.Client, aesKey string) {
	aesKey = strings.TrimPrefix(aesKey, "0x")
	keyHash := util.Keccak256(aesKey)
	aesGcmCrypto := util.AesGcmCrypto(aesKey)

	SRC20Abi := util.ParseABI()
	src20Address := common.HexToAddress(util.LoadSRC20Address())

	var wg sync.WaitGroup
	wg.Add(2)

	// Event listener for Transfer
	go func() {
		defer wg.Done()
		transferEventID := SRC20Abi.Events["Transfer"].ID
		sub, logs := SubscribeToEvent(client, src20Address, transferEventID, keyHash)
		defer sub.Unsubscribe()

		for {
			select {
			case err := <-sub.Err():
				fmt.Fprintf(os.Stderr, "Error subscribing to Transfer: %v\n", err)
				return
			case vLog := <-logs:
				HandleTransferEvent(SRC20Abi, vLog, aesGcmCrypto)
			}
		}
	}()

	// Event listener for Approval
	go func() {
		defer wg.Done()
		approvalEventID := SRC20Abi.Events["Approval"].ID
		sub, logs := SubscribeToEvent(client, src20Address, approvalEventID, keyHash)
		defer sub.Unsubscribe()

		for {
			select {
			case err := <-sub.Err():
				fmt.Fprintf(os.Stderr, "Error subscribing to Approval: %v\n", err)
				return
			case vLog := <-logs:
				HandleApprovalEvent(SRC20Abi, vLog, aesGcmCrypto)
			}
		}
	}()

	wg.Wait()
}

func SubscribeToEvent(client *ethclient.Client, src20Address common.Address, eventID common.Hash, keyHash common.Hash) (ethereum.Subscription, chan types.Log) {
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

func HandleTransferEvent(SRC20Abi *abi.ABI, vLog types.Log, aesGcmCrypto cipher.AEAD) {
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
	amount := util.DecryptAmount(transferEvent.EncryptedAmount, aesGcmCrypto)

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

func HandleApprovalEvent(SRC20Abi *abi.ABI, vLog types.Log, aesGcmCrypto cipher.AEAD) {
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
	amount := util.DecryptAmount(approvalEvent.EncryptedAmount, aesGcmCrypto)

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
