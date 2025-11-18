package main

import (
	"fmt"
	"listener-go/util"
	"os"
)

func main() {
	util.LoadEnv()

	aesKey := util.RequireEnv("INTELLIGENCE_AES_KEY")
	if aesKey == "" {
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
		chain = util.SeismicDevnet
	}

	client := util.CreateInterface(chain)
	if client == nil {
		fmt.Fprintf(os.Stderr, "Error: Failed to create client\n")
		os.Exit(1)
	}
	defer client.Close()

	fmt.Printf("Listening for events on network: %s\n\n", chain.Name)
	AttachEventListener(client, aesKey)
}
