// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Owned} from "solmate/auth/Owned.sol";

import {AesLib} from "./AesLib.sol";

contract Intelligence is Owned {
    error KeyNotFound();

    suint256[] private keys;
    uint96 public nonce;

    constructor(address _owner, suint256[] memory _keys) Owned(_owner) {
        keys = _keys;
    }

    function numKeys() public view returns (uint256) {
        return uint256(keys.length);
    }

    function encrypt(uint256 _keyIdx, bytes memory _plaintext) 
        public
        view 
        returns (bytes memory) 
    {
        if (_keyIdx >= uint256(keys.length)) {
            revert KeyNotFound();
        }

        bytes memory ciphertext = AesLib.AES256GCMEncrypt(
            keys[suint256(_keyIdx)],
            nonce, 
            _plaintext
        );
        bytes memory ciphertextWithNonce = AesLib.packNonce(ciphertext, nonce);
        
        nonce++;
        return ciphertextWithNonce;
    }

    function encryptAll(bytes memory _plaintext) 
        public
        view
        returns (bytes[] memory)
    {
        bytes[] memory ciphertextWithNonce = new bytes[](uint256(keys.length));
        for (uint256 i = 0; i < uint256(keys.length); i++) {
            ciphertextWithNonce[i] = encrypt(i, _plaintext);
        }
        return ciphertextWithNonce;
    }

    function decrypt(suint256 key, bytes memory _ciphertextWithNonce)
        public
        view
        returns (bytes memory) 
    {
        (bytes memory extractedCT, uint96 extractedNonce) = AesLib.splitNonce(
            _ciphertextWithNonce
        );
        return AesLib.AES256GCMDecrypt(key, extractedNonce, extractedCT);
    }

    function addKey(suint256 _key) external onlyOwner {
        keys.push(_key);
    }

    function removeKey(suint256 _key) external onlyOwner {
        uint256 idx = findKeyIndex(_key);
        if (idx == type(uint256).max) {
            revert KeyNotFound();
        }
        keys[suint256(idx)] = keys[suint256(keys.length - suint256(1))];
        keys.pop();
    }

    function findKeyIndex(suint256 _key) internal view returns (uint256) {
        for (uint256 i = 0; i < uint256(keys.length); i++) {
            if (keys[suint256(i)] == _key) {
                return uint256(i);  
            }
        }
        return type(uint256).max;
    }
}
