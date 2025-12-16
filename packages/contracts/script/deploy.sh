#!/usr/bin/env bash

set -e

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

# Parse the broadcast output and create deploy.json using jq directly
# This extracts all CREATE transactions and builds a JSON object
jq -r '[.transactions[] | select(.transactionType == "CREATE") | {(.contractName): .contractAddress}] | add' "$BROADCAST_OUT" > ./out/deploy.json

echo "Deployed contracts:"
cat ./out/deploy.json
