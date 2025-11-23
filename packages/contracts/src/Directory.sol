// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {AesLib} from "../lib/AesLib.sol";
import {RngLib} from "../lib/RngLib.sol";

contract Directory {
    mapping(address => suint256) private keys;

    event KeyGenerated(address indexed addr);

    function genKey() public {
        suint256 key = AesLib.HKDFDeriveKey(RngLib.getRandomBytes(32, 0));
        keys[msg.sender] = key;

        emit KeyGenerated(msg.sender);
    }

    function getKey() public view hasKey returns (uint256) {
        return uint256(keys[msg.sender]);
    }

    function getKeyHash() public view hasKey returns (bytes32) {
        return keccak256(abi.encodePacked(keys[msg.sender]));
    }

    function checkHasKey(address _addr) public view returns (bool) {
        return keys[_addr] != suint256(0);
    }

    modifier hasKey() {
        require(keys[msg.sender] != suint256(0), "NO_KEY_GENERATED");
        _;
    }
}
