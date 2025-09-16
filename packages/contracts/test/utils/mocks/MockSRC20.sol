// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.13;

import {ERC20} from "solmate/tokens/ERC20.sol";

import {SRC20} from "../../../src/SRC20.sol";

contract MockSRC20 is SRC20 {
    constructor(ERC20 _baseAsset, string memory _name, string memory _symbol, uint8 _decimals)
        SRC20(_baseAsset, _name, _symbol, _decimals)
    {}
}
