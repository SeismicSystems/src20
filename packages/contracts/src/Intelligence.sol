// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Owned} from "solmate/auth/Owned.sol";

import {AesLib} from "./AesLib.sol";
import {IIntelligence} from "./IIntelligence.sol";

contract Intelligence is Owned, IIntelligence {
    error KeyNotFound();

    suint256[] private keys;
    bytes32[] private keyHashes;
    uint96 public nonce;

    constructor(address _owner, suint256[] memory _keys) Owned(_owner) {
        keys = _keys;
        keyHashes = hashKeys(_keys);
    }

    function numKeys() public view returns (uint256) {
        return uint256(keys.length);
    }

    function encryptIdx(uint256 _keyIdx, bytes memory _plaintext) public returns (bytes memory) {
        if (_keyIdx >= uint256(keys.length)) {
            revert KeyNotFound();
        }

        suint256 key = keys[_keyIdx];
        bytes memory ciphertext = AesLib.AES256GCMEncrypt(key, nonce, _plaintext);
        bytes memory encryptedData = AesLib.packEncryptedData(ciphertext, nonce);

        nonce++;
        return encryptedData;
    }

    function decrypt(suint256 key, bytes memory _encryptedData) public view returns (bytes memory) {
        (bytes memory ct, uint96 nce) = AesLib.parseEncryptedData(_encryptedData);
        return AesLib.AES256GCMDecrypt(key, nce, ct);
    }

    function encrypt(bytes memory _plaintext) external returns (bytes32[] memory, bytes[] memory) {
        bytes[] memory encryptedData = new bytes[](uint256(keys.length));
        for (uint256 i = 0; i < uint256(keys.length); i++) {
            encryptedData[i] = encryptIdx(i, _plaintext);
        }
        return (keyHashes, encryptedData);
    }

    function addKey(suint256 _key) external onlyOwner {
        keys.push(_key);
        keyHashes.push(hashKey(_key));
    }

    function removeKey(suint256 _key) external onlyOwner {
        uint256 idx = findKeyIndex(_key);
        if (idx == type(uint256).max) {
            revert KeyNotFound();
        }

        keys[idx] = keys[uint256(keys.length) - 1];
        keys.pop();

        keyHashes[idx] = keyHashes[keyHashes.length - 1];
        keyHashes.pop();
    }

    function hashKey(suint256 _key) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_key));
    }

    function hashKeys(suint256[] memory _keys) internal pure returns (bytes32[] memory) {
        bytes32[] memory hashes = new bytes32[](uint256(_keys.length));
        for (uint256 i = 0; i < uint256(_keys.length); i++) {
            hashes[i] = hashKey(_keys[i]);
        }
        return hashes;
    }

    function findKeyIndex(suint256 _key) internal view returns (uint256) {
        for (uint256 i = 0; i < uint256(keys.length); i++) {
            if (keys[i] == _key) {
                return i;
            }
        }
        return type(uint256).max;
    }
}
