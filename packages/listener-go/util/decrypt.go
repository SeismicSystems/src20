package util

import (
	"crypto/aes"
	"crypto/cipher"
	"encoding/hex"
	"fmt"
	"math/big"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

const NONCE_LENGTH = 12

func Keccak256(input string) common.Hash {
	input = strings.TrimPrefix(input, "0x")

	inputBytes, err := hex.DecodeString(input)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to convert hex string to bytes: %v\n", err)
		return common.Hash{}
	}

	return crypto.Keccak256Hash(inputBytes)
}

func DecryptAmount(encryptedData []byte, aesGcmCrypto cipher.AEAD) *big.Int {
	nonce := encryptedData[len(encryptedData)-NONCE_LENGTH:]
	ciphertext := encryptedData[:len(encryptedData)-NONCE_LENGTH]

	plaintext, err := aesGcmCrypto.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to decrypt: %v\n", err)
	}

	return new(big.Int).SetBytes(plaintext)
}

func AesGcmCrypto(aesKey string) cipher.AEAD {
	aesKey = strings.TrimPrefix(aesKey, "0x")
	aesKeyBytes, err := hex.DecodeString(aesKey)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to convert AES key to bytes: %v\n", err)
		return nil
	}

	block, err := aes.NewCipher(aesKeyBytes)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create AES cipher: %v\n", err)
		return nil
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create GCM: %v\n", err)
		return nil
	}
	return gcm
}
