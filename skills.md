# Technical Reference: SRC20 Batch Reader

## Signature Scheme

The signature must be **token-agnostic** so one signature works for all SRC20 tokens.

### Option A: Personal Sign (Simple)

```solidity
bytes32 messageHash = keccak256(abi.encodePacked("SRC20_BALANCE_READ", owner, expiry));
bytes32 ethSignedHash = keccak256(abi.encodePacked(
    "\x19Ethereum Signed Message:\n32",
    messageHash
));
address signer = ecrecover(ethSignedHash, v, r, s);
require(signer == owner, "invalid signature");
```

### Option B: EIP-712 (Standardized Domain)

Domain WITHOUT `verifyingContract` so signature works across all tokens:

```solidity
bytes32 DOMAIN_SEPARATOR = keccak256(abi.encode(
    keccak256("EIP712Domain(string name,string version,uint256 chainId)"),
    keccak256("SRC20"),
    keccak256("1"),
    block.chainid
    // NO verifyingContract!
));

bytes32 BALANCE_READ_TYPEHASH = keccak256("BalanceRead(address owner,uint256 expiry)");

bytes32 structHash = keccak256(abi.encode(BALANCE_READ_TYPEHASH, owner, expiry));
bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
address signer = ecrecover(digest, v, r, s);
```

**Important:** All SRC20 tokens must use the SAME domain separator (computed identically).

---

## Signature Decoding

Signatures come as `bytes calldata signature` (65 bytes):

```solidity
function _recoverSigner(bytes32 digest, bytes calldata signature) internal pure returns (address) {
    require(signature.length == 65, "invalid signature length");
    bytes32 r;
    bytes32 s;
    uint8 v;
    assembly {
        r := calldataload(signature.offset)
        s := calldataload(add(signature.offset, 32))
        v := byte(0, calldataload(add(signature.offset, 64)))
    }
    return ecrecover(digest, v, r, s);
}
```

Or use OpenZeppelin's `ECDSA.recover(digest, signature)`.

---

## Seismic Shielded Types

```solidity
mapping(address => suint256) internal balance;  // Shielded storage

function balanceOfSigned(...) external view returns (uint256) {
    // ... verify signature ...
    return uint256(balance[owner]);  // Cast to reveal
}
```

---

## Expiry Check

```solidity
require(block.timestamp <= expiry, "signature expired");
```

Use `<=` not `<` so expiry timestamp itself is valid.

---

## Foundry Test Helpers

**Generate signature:**
```solidity
uint256 expiry = block.timestamp + 1 hours;
bytes32 messageHash = keccak256(abi.encodePacked("SRC20_BALANCE_READ", user, expiry));
bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
(uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, ethSignedHash);
bytes memory signature = abi.encodePacked(r, s, v);
```

**Test expired signature:**
```solidity
uint256 expiry = block.timestamp - 1;  // Already expired
vm.expectRevert("signature expired");
token.balanceOfSigned(user, expiry, signature);
```

**Test invalid signer:**
```solidity
(uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPrivateKey, digest);
vm.expectRevert("invalid signature");
token.balanceOfSigned(user, expiry, abi.encodePacked(r, s, v));
```

---

## Multicall Pattern

```solidity
function batchBalances(
    address owner,
    address[] calldata tokens,
    uint256 expiry,
    bytes calldata signature
) external view returns (uint256[] memory balances) {
    uint256 len = tokens.length;
    balances = new uint256[](len);
    
    for (uint256 i = 0; i < len; ) {
        balances[i] = ISRC20(tokens[i]).balanceOfSigned(owner, expiry, signature);
        unchecked { ++i; }
    }
}
```

---

## Common Gotchas

1. **Domain separator must be identical** - If using EIP-712, all tokens must compute the same domain (no `verifyingContract`)

2. **Signature is 65 bytes** - r (32) + s (32) + v (1)

3. **View functions cost no gas** - But still have computation limits on RPC calls

4. **ecrecover returns address(0) on failure** - Always check `signer != address(0) && signer == owner`

5. **Block timestamp in tests** - Use `vm.warp()` to test expiry edge cases

