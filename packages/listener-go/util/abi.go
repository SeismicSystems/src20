package util

const SRC20Abi = `[
	{
		"type": "event",
		"name": "Approval",
		"inputs": [
			{"name": "owner", "type": "address", "indexed": true, "internalType": "address"},
			{"name": "spender", "type": "address", "indexed": true, "internalType": "address"},
			{"name": "encryptKeyHash", "type": "bytes32", "indexed": true, "internalType": "bytes32"},
			{"name": "encryptedAmount", "type": "bytes", "indexed": false, "internalType": "bytes"}
		],
		"anonymous": false
	},
	{
		"type": "event",
		"name": "Transfer",
		"inputs": [
			{"name": "from", "type": "address", "indexed": true, "internalType": "address"},
			{"name": "to", "type": "address", "indexed": true, "internalType": "address"},
			{"name": "encryptKeyHash", "type": "bytes32", "indexed": true, "internalType": "bytes32"},
			{"name": "encryptedAmount", "type": "bytes", "indexed": false, "internalType": "bytes"}
		],
		"anonymous": false
	}
]`
