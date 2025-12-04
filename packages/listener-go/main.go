package main

import (
	"encoding/hex"
	"fmt"
	"os"
	"strings"

	"listener-go/util"
)

func main() {
	util.LoadEnv()

	aesKeyStr := util.RequireEnv("INTELLIGENCE_AES_KEY")
	if aesKeyStr == "" {
		fmt.Fprintf(os.Stderr, "Error: INTELLIGENCE_AES_KEY is required\n")
		os.Exit(1)
	}

	mode := util.RequireEnv("MODE")
	if mode == "" {
		fmt.Fprintf(os.Stderr, "Error: MODE is required\n")
		os.Exit(1)
	}

	var chain util.Chain
	if mode == "local" {
		chain = util.Sanvil
	} else {
		chain = util.IntegrationChain
	}

	aesKey, err := hex.DecodeString(strings.TrimPrefix(aesKeyStr, "0x"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: Failed to convert AES key string to bytes: %v\n", err)
		os.Exit(1)
	}

	client := util.CreateInterface(chain)
	if client == nil {
		fmt.Fprintf(os.Stderr, "Error: Failed to create client\n")
		os.Exit(1)
	}
	defer client.Close()

	fmt.Printf("Listening for events on network: %s\n\n", chain.Name)
	attachEventListener(client, aesKey)
}
