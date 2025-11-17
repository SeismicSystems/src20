package main

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"encoding/hex"
	"fmt"
	"listener-go/util"
	"log"
	"math/big"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

const NONCE_LENGTH = 12
const AES_KEY = "0aa14dad19b11c95fd366db53bf02b8aceaf3c699b64751bf2ca401eeefd722c"

func main() {
	util.LoadEnv()

	// privKey := util.RequireEnv("ALICE_PRIVATE_KEY")
	// aesKey := util.RequireEnv("INTELLIGENCE_AES_KEY")
	mode := util.RequireEnv("MODE")

	var chain util.Chain
	if mode == "local" {
		chain = util.Sanvil
	} else {
		chain = util.SeismicDevnet
	}

	client := util.CreateInterface(chain)

	contractAddress := common.HexToAddress("0x42b7b5E6eC7B8bB9C763Df2adAF0474e16A00c6f")
	contractAbi, err := abi.JSON(strings.NewReader(`[{"type":"event","name":"Transfer","inputs":[{"name":"from","type":"address","indexed":true,"internalType":"address"},{"name":"to","type":"address","indexed":true,"internalType":"address"},{"name":"encryptKeyHash","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"encryptedAmount","type":"bytes","indexed":false,"internalType":"bytes"}],"anonymous":false}]`))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to parse the ABI: %v", err)
	}

	query := ethereum.FilterQuery{
		Addresses: []common.Address{contractAddress},
		Topics:    [][]common.Hash{{contractAbi.Events["Transfer"].ID}},
	}
	logs := make(chan types.Log)
	sub, err := client.SubscribeFilterLogs(context.Background(), query, logs)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to subscribe to logs: %v", err)
	}
	defer sub.Unsubscribe()

	fmt.Printf("Listening for events on network: %s\n\n", chain.Name)
	for {
		select {
		case err := <-sub.Err():
			fmt.Fprintf(os.Stderr, "Subscription error: %v", err)
		case vLog := <-logs:
			var transferEvent struct {
				From            common.Address
				To              common.Address
				EncryptKeyHash  common.Hash
				EncryptedAmount []byte
			}
			err := contractAbi.UnpackIntoInterface(&transferEvent, "Transfer", vLog.Data)
			if err != nil {
				log.Printf("Failed to unpack event: %v", err)
				continue
			}
			transferEvent.From = common.BytesToAddress(vLog.Topics[1].Bytes())
			transferEvent.To = common.BytesToAddress(vLog.Topics[2].Bytes())
			transferEvent.EncryptKeyHash = common.BytesToHash(vLog.Topics[3].Bytes())

			encryptedData := transferEvent.EncryptedAmount
			nonce := encryptedData[len(encryptedData)-NONCE_LENGTH:]
			ciphertext := encryptedData[:len(encryptedData)-NONCE_LENGTH]

			aesKeyBytes, err := hex.DecodeString(AES_KEY)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Failed to decode AES key: %v\n", err)
				continue
			}

			block, err := aes.NewCipher(aesKeyBytes)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Failed to create AES cipher: %v", err)
			}

			gcm, err := cipher.NewGCM(block)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Failed to create GCM: %v", err)
			}

			plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Failed to open GCM: %v", err)
			}

			amount := new(big.Int).SetBytes(plaintext)

			fmt.Printf("Transfer(address from, address to, bytes encryptedAmount)\n\n    from: %s\n    to: %s\n    amount: %d\n\n",
				transferEvent.From,
				transferEvent.To,
				amount)
		}
	}
}
