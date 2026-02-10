// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.13;

import {ISRC20} from "./interfaces/ISRC20.sol";

/// @notice Batch reader for SRC20 shielded balances using a single signature.
contract SRC20Multicall {
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
}
