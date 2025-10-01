// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IIntelligence {
    function numKeys() external view returns (uint256);

    function encryptIdx(uint256 _keyIdx, bytes memory _plaintext) external returns (bytes memory);
    function decrypt(suint256 key, bytes memory _encryptedData) external view returns (bytes memory);
    function encrypt(bytes memory _plaintext) external returns (bytes32[] memory, bytes[] memory);

    function addKey(suint256 _key) external;
    function removeKey(suint256 _key) external;
}
