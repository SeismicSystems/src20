// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.13;

import {SRC20} from "../../../src/SRC20.sol";

contract MockSRC20 is SRC20 {
    constructor(
        address _intelligence,
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) SRC20(_intelligence, _name, _symbol, _decimals) {}

    function totalSupply() public view virtual returns (uint256) {
        return _totalSupply();
    }

    function mint(address to, suint256 value) public virtual {
        _mint(to, value);
    }

    function burn(address from, suint256 value) public virtual {
        _burn(from, value);
    }
}
