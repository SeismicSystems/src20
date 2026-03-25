package main

import (
	"encoding/hex"
	"flag"
	"fmt"
	"os"
	"strings"

	"listener-go/util"
)

func main() {
	// CLI flags
	fromBlock := flag.Int64("from", -1, "Start block number for historical range query")
	toBlock := flag.Int64("to", -1, "End block number for historical range query (default: latest)")
	rpcURL := flag.String("rpc", "", "Custom RPC URL (overrides MODE-based selection)")
	contractAddr := flag.String("contract", "", "SRC20 contract address (overrides deploy.json, use 'none' to match all)")
	noContract := flag.Bool("no-contract", false, "Skip contract address filter (match all contracts)")
	flag.Parse()

	util.LoadEnv()

	aesKeyStr := util.RequireEnv("INTELLIGENCE_AES_KEY")
	if aesKeyStr == "" {
		fmt.Fprintf(os.Stderr, "Error: INTELLIGENCE_AES_KEY is required\n")
		os.Exit(1)
	}

	aesKey, err := hex.DecodeString(strings.TrimPrefix(aesKeyStr, "0x"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: Failed to convert AES key string to bytes: %v\n", err)
		os.Exit(1)
	}

	// Determine RPC URL (defaults to gcp-0 testnet)
	var dialURL string
	if *rpcURL != "" {
		dialURL = *rpcURL
	} else {
		mode := os.Getenv("MODE")
		var chain util.Chain
		switch mode {
		case "local":
			chain = util.Sanvil
		case "gcp-0":
			chain = util.SeismicTestnetGcp0
		default:
			chain = util.DefaultTestnet
		}
		dialURL = chain.RPCUrl
	}

	// Determine contract address
	var contract string
	if *noContract {
		contract = ""
	} else if *contractAddr != "" {
		contract = *contractAddr
	} else {
		contract = util.LoadSRC20Address()
	}

	client := util.CreateClient(dialURL)
	if client == nil {
		fmt.Fprintf(os.Stderr, "Error: Failed to create client\n")
		os.Exit(1)
	}
	defer client.Close()

	if *fromBlock >= 0 {
		// Historical mode: query block range
		var to int64
		if *toBlock >= 0 {
			to = *toBlock
		} else {
			to = -1 // signals "latest"
		}
		fmt.Printf("Querying events from block %d to %s on %s\n", *fromBlock, formatBlockNum(to), dialURL)
		if contract != "" {
			fmt.Printf("Contract: %s\n", contract)
		} else {
			fmt.Printf("Contract: all (no filter)\n")
		}
		fmt.Println()
		queryBlockRange(client, aesKey, contract, *fromBlock, to)
	} else {
		// Live mode: subscribe to new events
		fmt.Printf("Listening for events on %s\n\n", dialURL)
		attachEventListener(client, aesKey, contract)
	}
}

func formatBlockNum(n int64) string {
	if n < 0 {
		return "latest"
	}
	return fmt.Sprintf("%d", n)
}
