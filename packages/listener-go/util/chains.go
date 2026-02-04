package util

type Chain struct {
	Name   string
	RPCUrl string
}

var Sanvil = Chain{
	Name:   "Anvil",
	RPCUrl: "ws://127.0.0.1:8545",
}

var IntegrationChain = Chain{
	Name:   "Integration Chain",
	RPCUrl: "wss://gcp-1.seismictest.net/ws",
}
