#!/bin/bash

parse_broadcast() {
    local file_path="$1"
    local -n contract_map="$2"
    
    if [[ ! -f "$file_path" ]]; then
        echo "Error: File '$file_path' not found" >&2
        return 1
    fi
    
    contract_map=()
    
    while IFS=':' read -r contract_name contract_address; do
        if [[ -n "$contract_name" && -n "$contract_address" ]]; then
            contract_map["$contract_name"]="$contract_address"
        fi
    done < <(jq -r '.transactions[] | select(.transactionType == "CREATE") | "\(.contractName):\(.contractAddress)"' "$file_path" 2>/dev/null)
}

array_to_json() {
    local -n arr="$1"
    local json="{"
    local first=true
    
    for key in "${!arr[@]}"; do
        if [[ "$first" == true ]]; then
            first=false
        else
            json+=","
        fi
        json+="\"$key\":\"${arr[$key]}\""
    done
    json+="}"
    echo "$json"
}

source ./.env
if [ "$MODE" == "local" ]; then
    RPC_URL=http://127.0.0.1:8545
    CHAIN_ID=31337
else
    RPC_URL=https://lyron.seismicdev.net/rpc
    CHAIN_ID=5124
fi
BROADCAST_OUT=./broadcast/Deploy.s.sol/$CHAIN_ID/run-latest.json

sforge script script/Fund.s.sol:Fund \
    --rpc-url $RPC_URL \
    --broadcast

sforge script script/Deploy.s.sol:Deploy \
    --rpc-url $RPC_URL \
    --broadcast

declare -A contract_addresses
parse_broadcast "$BROADCAST_OUT" contract_addresses

echo "$(array_to_json contract_addresses)" > ./out/deploy.json
