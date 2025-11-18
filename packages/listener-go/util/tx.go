package util

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/ethclient"
)

func CreateInterface(chain Chain) *ethclient.Client {
	client, err := ethclient.Dial(chain.RPCUrl)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to connect to RPC: %v", err)
		return nil
	}
	return client
}

func LoadSRC20Address() string {
	jsonPath := filepath.Join("..", "contracts", "out", "deploy.json")

	data, err := os.ReadFile(jsonPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to read deploy.json: %v\n", err)
		return ""
	}

	var deployOut map[string]string
	if err := json.Unmarshal(data, &deployOut); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to parse deploy.json: %v\n", err)
		return ""
	}

	return deployOut["MockSRC20"]
}

func ParseABI() *abi.ABI {
	contractAbi, err := abi.JSON(strings.NewReader(SRC20Abi))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to parse ABI: %v\n", err)
		return nil
	}
	return &contractAbi
}
