#!/usr/bin/env bash

set -e

source ./.env
if [ "$MODE" == "local" ]; then
    RPC_URL=http://127.0.0.1:8545
    CHAIN_ID=31337
else
    RPC_URL=https://gcp-1.seismictest.net/rpc
    CHAIN_ID=5124
fi
BROADCAST_OUT=./broadcast/DeployMultiToken.s.sol/$CHAIN_ID/run-latest.json

echo "🚀 Deploying SRC20 tokens + multicall contract..."

sforge script script/Fund.s.sol:Fund \
    --rpc-url $RPC_URL \
    --broadcast \
    --unsafe-private-storage

sforge script script/DeployMultiToken.s.sol:DeployMultiToken \
    --rpc-url $RPC_URL \
    --broadcast \
    --unsafe-private-storage

echo "📋 Parsing deployment output..."

# Extract multicall address
MULTICALL_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "SRC20Multicall") | .contractAddress' "$BROADCAST_OUT")

# Extract all token addresses in deployment order (remove duplicates while preserving order)
TOKEN_ADDRESSES=$(jq -r '
  [.transactions[] | select(.contractName == "MockSRC20") | .contractAddress] 
  | reduce .[] as $item (
      []; 
      if . | index($item) | not then . + [$item] else . end
    )' "$BROADCAST_OUT")

# Create the batch-read deployment JSON
cat > ./out/batch-read-deploy.json << EOF
{
  "multicall": "$MULTICALL_ADDRESS",
  "tokens": $TOKEN_ADDRESSES
}
EOF

TOKEN_COUNT=$(echo $TOKEN_ADDRESSES | jq length)
echo "✅ Batch read deployment complete!"
echo "📄 Multicall address: $MULTICALL_ADDRESS"
echo "🪙 Number of tokens deployed: $TOKEN_COUNT"
echo "📁 Addresses saved to: ./out/batch-read-deploy.json"

# Display the JSON for verification
echo ""
echo "=== DEPLOYMENT SUMMARY ==="
cat ./out/batch-read-deploy.json | jq .