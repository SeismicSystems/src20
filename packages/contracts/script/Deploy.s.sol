// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {AesLib} from "../src/AesLib.sol";
import {Intelligence} from "../src/Intelligence.sol";
import {SRC20} from "../src/SRC20.sol";

import {MockSRC20} from "../test/utils/mocks/MockSRC20.sol";

contract Deploy is Script {
    function run() public {
        uint256 deployerPrivkey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 alicePrivkey = vm.envUint("ALICE_PRIVATE_KEY");
        suint256 intelligenceAESKey = suint256(vm.envUint("INTELLIGENCE_AES_KEY"));

        address deployer = vm.addr(deployerPrivkey);
        address alice = vm.addr(alicePrivkey);

        suint256[] memory keys = new suint256[](suint256(1));
        keys[0] = suint256(intelligenceAESKey);

        vm.startBroadcast(deployerPrivkey);
        Intelligence intelligence = new Intelligence(deployer, keys);
        MockSRC20 token = new MockSRC20(address(intelligence), "Token", "TKN", 18);
        token.mint(alice, suint256(2e27));
        vm.stopBroadcast();
    }
}
