// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {MockSRC20} from "../test/utils/mocks/MockSRC20.sol";
import {MockERC20} from "../test/utils/mocks/MockERC20.sol";

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

        // Deploy SRC20 (confidential token)
        MockSRC20 src20 = new MockSRC20("Confidential Token", "cTKN", 18);
        src20.mint(alice, suint256(2e27));
        src20.mint(bob, suint256(2e27));
        src20.mint(charlie, suint256(2e27));
        console.log("MockSRC20 deployed at:", address(src20));

        // Deploy ERC20 (standard token)
        MockERC20 erc20 = new MockERC20("Standard Token", "sTKN", 18);
        erc20.mint(alice, 2e27);
        erc20.mint(bob, 2e27);
        erc20.mint(charlie, 2e27);
        console.log("MockERC20 deployed at:", address(erc20));

        vm.stopBroadcast();
    }
}
