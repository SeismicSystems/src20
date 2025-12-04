// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {MockSRC20} from "../test/utils/mocks/MockSRC20.sol";

contract Deploy is Script {
    function run() public {
        uint256 deployerPrivkey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 alicePrivkey = vm.envUint("ALICE_PRIVATE_KEY");
        uint256 bobPrivkey = vm.envUint("BOB_PRIVATE_KEY");
        uint256 charliePrivkey = vm.envUint("CHARLIE_PRIVATE_KEY");

        address alice = vm.addr(alicePrivkey);
        address bob = vm.addr(bobPrivkey);
        address charlie = vm.addr(charliePrivkey);

        vm.startBroadcast(deployerPrivkey);
        MockSRC20 token = new MockSRC20("Token", "TKN", 18);
        token.mint(alice, suint256(2e27));
        token.mint(bob, suint256(2e27));
        token.mint(charlie, suint256(2e27));
        vm.stopBroadcast();
    }
}
