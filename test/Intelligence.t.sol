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
        keys[suint256(0)] = AesLib.HKDFDeriveKey(abi.encodePacked("key0"));
        keys[suint256(1)] = AesLib.HKDFDeriveKey(abi.encodePacked("key1"));

        intelligence = new Intelligence(address(this), keys);
    }

    function extractCT(bytes memory _ciphertextWithNonce)
        internal 
        pure
        returns (bytes memory)
    {
        (bytes memory extractedCT, ) = AesLib.splitNonce(
             _ciphertextWithNonce
        );
        return extractedCT;
    }

    function testEncrypt() public {
        bytes memory intelligenceCiphertext = intelligence.encrypt(
            0,
            sampleMsg
        );
        bytes memory directCiphertext = AesLib.AES256GCMEncrypt(
            keys[suint256(0)],  
            0,
            sampleMsg
        );
        assertEq(
            extractCT(intelligenceCiphertext), 
            directCiphertext
        );

        bytes memory decrypted = intelligence.decrypt(
            keys[suint256(0)], 
            intelligenceCiphertext
        );
        assertEq(decrypted, sampleMsg);
    }

    function testEncryptAll() public {
        bytes[] memory intelligenceCiphertext = intelligence.encryptAll(
            sampleMsg
        );

        bytes[] memory directCiphertext = new bytes[](2);
        directCiphertext[0] = AesLib.AES256GCMEncrypt(
            keys[suint256(0)], 
            0,
            sampleMsg
        );
        directCiphertext[1] = AesLib.AES256GCMEncrypt(
            keys[suint256(1)], 
            1,
            sampleMsg
        );

        assertEq(
            extractCT(intelligenceCiphertext[0]), 
            directCiphertext[0]
        );
        assertEq(
            extractCT(intelligenceCiphertext[1]), 
            directCiphertext[1]
        );
    }

    function testAddKey() public {
        suint256 key = AesLib.HKDFDeriveKey(abi.encodePacked("key2"));
        intelligence.addKey(key);

        bytes memory intelligenceCiphertext = intelligence.encrypt(
            2,
            sampleMsg
        );
        bytes memory directCiphertext = AesLib.AES256GCMEncrypt(
            key,
            0,
            sampleMsg
        );

        assertEq(intelligence.numKeys(), 3);
        assertEq(
            extractCT(intelligenceCiphertext), 
            directCiphertext
        );
    }
}
