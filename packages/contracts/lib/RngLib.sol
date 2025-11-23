// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title RngLib
 * @notice This library provides an interface to a Random Number Generator (RNG) precompiled contract.
 * @dev It defines two functions:
 *      1. `getRandomBytes` - Returns random bytes of a specified length, incorporating user-provided
 *         personalization data.
 *      2. `getRandomUint256` - Returns a random `uint256` without requiring caller input
 *
 * The RNG precompile is referenced by the constant `RNG_PRECOMPILE`.
 */
library RngLib {
    /**
     * @notice The address of the RNG precompiled contract.
     */
    address internal constant RNG_PRECOMPILE = address(0x64);

    /**
     * @dev Error that is raised when RNG precompile call fails.
     */
    error RngPrecompileCallFailed();

    /**
     * @notice Calls the RNG precompile to obtain random bytes of variable length.
     * @dev This function encodes the desired output length (`uint16`) and a personalization parameter (`bytes32`)
     *      and sends them to the precompile. If the call is successful, it returns the random bytes.
     * @param output_len The desired length of the random byte array.
     * @param pers Personalization data (32 bytes) to add user specified entropy to the RNG process.
     * @return Random data as a bytes array, matching the specified length.
     *
     * Requirements:
     * - The staticcall to the RNG precompile must succeed.
     * - If the call fails, the transaction reverts with "RNG Precompile call failed".
     */
    function getRandomBytes(
        uint16 output_len,
        bytes32 pers
    ) internal view returns (bytes memory) {
        // Prepare the input for the RNG precompile.
        bytes memory input = abi.encodePacked(output_len, pers);

        // Call the precompile.
        (bool success, bytes memory output) = RNG_PRECOMPILE.staticcall(input);
        if (!success) revert RngPrecompileCallFailed();

        // Return the random bytes.
        return output;
    }

    /**
     * @notice Calls the RNG precompile to obtain a random uint256 value.
     * @dev Internally, this function requests 32 bytes of random data, then converts
     *      the response to a `uint256`.
     * @return result A random `uint256` value.
     *
     * Requirements:
     * - The staticcall to the RNG precompile must succeed.
     * - If the call fails, the transaction reverts with "RNG Precompile call failed".
     */
    function getRandomUint256() internal view returns (uint256 result) {
        // We request 32 bytes for a full uint256.
        uint32 output_len = 32;
        bytes memory input = abi.encodePacked(output_len);

        // Call the precompile.
        (bool success, bytes memory output) = RNG_PRECOMPILE.staticcall(input);
        if (!success) revert RngPrecompileCallFailed();

        // Convert the returned bytes to uint256.
        assembly {
            result := mload(add(output, 32))
        }
    }

    /**
     * @notice Calls the RNG precompile to obtain a random uint256 value.
     * @dev Internally, this function requests 32 bytes of random data, then converts
     *      the response to a `uint256`.
     * @return result A random `suint256` value.
     *
     * Requirements:
     * - The staticcall to the RNG precompile must succeed.
     * - If the call fails, the transaction reverts with "RNG Precompile call failed".
     */
    function getRandomSuint256() internal view returns (suint256 result) {
        // We request 32 bytes for a full uint256.
        uint32 output_len = 32;
        bytes memory input = abi.encodePacked(output_len);

        // Call the precompile.
        (bool success, bytes memory output) = RNG_PRECOMPILE.staticcall(input);
        if (!success) revert RngPrecompileCallFailed();

        // Convert the returned bytes to uint256.
        assembly {
            result := mload(add(output, 32))
        }
    }
}
