package util

import (
	"fmt"
	"os"

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
