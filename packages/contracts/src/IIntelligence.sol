// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IIntelligence {
    event OwnershipTransferred(address indexed user, address indexed newOwner);

    function owner() external view returns (address);
    function keyHashes(uint256) external view returns (bytes32);
    function nonce() external view returns (uint96);

    function numKeys() external view returns (uint256);

    function encryptIdx(
        uint256 _keyIdx,
        bytes memory _plaintext
    ) external returns (bytes memory);
    function decrypt(
        suint256 key,
        bytes memory _encryptedData
    ) external view returns (bytes memory);
    function encrypt(
        bytes memory _plaintext
    ) external returns (bytes32[] memory, bytes[] memory);

    function addKey(suint256 _key) external;
    function removeKey(suint256 _key) external;
}
