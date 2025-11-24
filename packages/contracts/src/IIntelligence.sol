// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IIntelligence {
    function encryptToProviders(
        bytes memory _plaintext
    ) external returns (bytes32[] memory, bytes[] memory);
}
