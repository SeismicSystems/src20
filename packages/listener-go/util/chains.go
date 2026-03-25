package util

type Chain struct {
	Name   string
	RPCUrl string
}

var Sanvil = Chain{
	Name:   "Anvil",
	RPCUrl: "ws://127.0.0.1:8545",
}

var SeismicTestnetGcp0 = Chain{
	Name:   "Seismic Testnet (gcp-0)",
	RPCUrl: "https://gcp-0.seismictest.net/rpc",
}

var SeismicTestnetGcp1 = Chain{
	Name:   "Seismic Testnet (gcp-1)",
	RPCUrl: "https://gcp-1.seismictest.net/rpc",
}

// Default testnet chain
var DefaultTestnet = SeismicTestnetGcp1
