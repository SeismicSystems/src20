package util

type Chain struct {
	Name   string
	RPCUrl string
}

var Sanvil = Chain{
	Name:   "Anvil",
	RPCUrl: "ws://127.0.0.1:8545",
}

var SeismicDevnet = Chain{
	Name:   "Seismic Devnet",
	RPCUrl: "wss://node-1.seismicdev.net/ws",
}
