// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

import {Intelligence} from "../src/Intelligence.sol";
import {AesLib} from "../src/AesLib.sol";

contract IntelligenceTest is Test {
    suint256[] keys;
    bytes sampleMsg;
    Intelligence intelligence;

    function setUp() public {
        sampleMsg = "hello world";

        keys = new suint256[](suint256(2));
        keys[0] = AesLib.HKDFDeriveKey(abi.encodePacked("key0"));
        keys[1] = AesLib.HKDFDeriveKey(abi.encodePacked("key1"));

        intelligence = new Intelligence(address(this), keys);
    }

    function extractCT(bytes memory _encryptedData) internal pure returns (bytes memory ct) {
        (ct,) = AesLib.parseEncryptedData(_encryptedData);
    }

    function testEncrypt() public {
        bytes memory encryptedData = intelligence.encryptIdx(0, sampleMsg);
        bytes memory directCiphertext = AesLib.AES256GCMEncrypt(keys[0], 0, sampleMsg);

        console.logBytes(encryptedData);
        console.logBytes(directCiphertext);

        assertEq(extractCT(encryptedData), directCiphertext);
    }

    function testDecrypt() public {
        bytes memory encryptedData = intelligence.encryptIdx(0, sampleMsg);
        bytes memory decryptResult = intelligence.decrypt(keys[0], encryptedData);

        assertEq(decryptResult, sampleMsg);
    }

    function testEncryptAll() public {
        (bytes32[] memory hashes, bytes[] memory encryptedData) = intelligence.encrypt(sampleMsg);

        bytes[] memory directCiphertext = new bytes[](2);
        directCiphertext[0] = AesLib.AES256GCMEncrypt(keys[0], 0, sampleMsg);
        directCiphertext[1] = AesLib.AES256GCMEncrypt(keys[1], 1, sampleMsg);
        assertEq(extractCT(encryptedData[0]), directCiphertext[0]);
        assertEq(extractCT(encryptedData[1]), directCiphertext[1]);

        bytes32[] memory directHashes = new bytes32[](2);
        directHashes[0] = keccak256(abi.encodePacked(keys[0]));
        directHashes[1] = keccak256(abi.encodePacked(keys[1]));
        assertEq(hashes[0], directHashes[0]);
        assertEq(hashes[1], directHashes[1]);
    }

    function testAddKey() public {
        suint256 key = AesLib.HKDFDeriveKey(abi.encodePacked("key2"));
        intelligence.addKey(key);

        bytes memory encryptedData = intelligence.encryptIdx(2, sampleMsg);
        bytes memory directCiphertext = AesLib.AES256GCMEncrypt(key, 0, sampleMsg);

        assertEq(intelligence.numKeys(), 3);
        assertEq(extractCT(encryptedData), directCiphertext);

        bytes32 h = intelligence.keyHashes(2);
        assertEq(h, keccak256(abi.encodePacked(key)));
    }

    function testRemoveKey() public {
        suint256 key = AesLib.HKDFDeriveKey(abi.encodePacked("key2"));
        intelligence.addKey(key);

        intelligence.removeKey(keys[1]);
        assertEq(intelligence.numKeys(), 2);

        (bytes32[] memory hashes, bytes[] memory encryptedData) = intelligence.encrypt(sampleMsg);

        bytes[] memory directCiphertext = new bytes[](2);
        directCiphertext[0] = AesLib.AES256GCMEncrypt(keys[0], 0, sampleMsg);
        directCiphertext[1] = AesLib.AES256GCMEncrypt(key, 1, sampleMsg);
        assertEq(extractCT(encryptedData[0]), directCiphertext[0]);
        assertEq(extractCT(encryptedData[1]), directCiphertext[1]);

        bytes32[] memory directHashes = new bytes32[](2);
        directHashes[0] = keccak256(abi.encodePacked(keys[0]));
        directHashes[1] = keccak256(abi.encodePacked(key));
        assertEq(hashes[0], directHashes[0]);
        assertEq(hashes[1], directHashes[1]);
    }

    function testRemoveUnknownKey() public {
        suint256 key = AesLib.HKDFDeriveKey(abi.encodePacked("key5"));
        vm.expectRevert(Intelligence.KeyNotFound.selector);
        intelligence.removeKey(key);
    }

    function testAddRemove(uint256[8][4] memory seeds, bool[8][4] memory shouldDelete) public {
        suint256[][] memory allKeys = new suint256[][](suint256(4));
        for (uint256 i = 0; i < 4; i++) {
            allKeys[i] = new suint256[](suint256(8));
            for (uint256 j = 0; j < 8; j++) {
                bytes memory seedBytes = abi.encodePacked(seeds[i][j]);
                allKeys[i][j] = AesLib.HKDFDeriveKey(seedBytes);
            }
        }

        // Goes through multiple rounds of adding and removing keys, saving
        // the keys that aren't deleted so they can be used to decrypt later.
        uint256 savedKeyIdx = 0;
        suint256[] memory savedKeys = new suint256[](suint256(4 * 8));
        for (uint256 i = 0; i < 4; i++) {
            for (uint256 j = 0; j < 8; j++) {
                suint256 key = allKeys[i][j];
                intelligence.addKey(key);
                if (!shouldDelete[i][j]) {
                    savedKeys[savedKeyIdx++] = key;
                }
            }
            for (uint256 j = 0; j < 8; j++) {
                if (shouldDelete[i][j]) {
                    intelligence.removeKey(allKeys[i][j]);
                }
            }
        }

        // Every ciphertext (aside from the ones generated by the first two
        // added in setUp()) should be decryptable by one of the saved keys.
        (bytes32[] memory hashes, bytes[] memory encryptedData) = intelligence.encrypt(sampleMsg);
        for (uint256 i = 2; i < intelligence.numKeys(); i++) {
            bool canDecrypt = false;
            for (uint256 j = 0; j < savedKeyIdx; j++) {
                bytes memory input = abi.encodePacked(savedKeys[j], uint96(i), extractCT(encryptedData[i]));
                address decryptAddr = AesLib.AES_DEC_PRECOMPILE;
                (bool callSuccess,) = decryptAddr.staticcall{gas: 300000}(input);
                bool hashMatch = keccak256(abi.encodePacked(savedKeys[j])) == hashes[i];
                canDecrypt = canDecrypt || (callSuccess && hashMatch);
            }
            assert(canDecrypt);
        }
    }
}
