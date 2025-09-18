// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {Intelligence} from "../src/Intelligence.sol";
import {SRC20} from "../src/SRC20.sol";

import {MockERC20} from "../test/utils/mocks/MockERC20.sol";
import {MockSRC20} from "../test/utils/mocks/MockSRC20.sol";

contract Deploy is Script {
    function run() public {
        uint256 deployerPrivkey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 alicePrivkey = vm.envUint("ALICE_PRIVATE_KEY");
        suint256 intelligenceAESKey = suint256(vm.envUint("INTELLIGENCE_AES_KEY"));

        address deployer = vm.addr(deployerPrivkey);
        address alice = vm.addr(alicePrivkey);

        suint256[] memory keys = new suint256[](suint256(1));
        keys[suint256(0)] = suint256(intelligenceAESKey);
        
        vm.startBroadcast(deployerPrivkey);
        Intelligence intelligence = new Intelligence(deployer, keys);
        MockERC20 underlying = new MockERC20("Underlying", "UNDR", 18);
        SRC20 token = new MockSRC20(underlying, intelligence, "Token", "TKN", 18);
        underlying.mint(alice, 2e27);
        vm.stopBroadcast();

        vm.startBroadcast(alicePrivkey);
        underlying.approve(address(token), 1e27);
        token.mint(1e27);
        vm.stopBroadcast();
    }
}
