// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {MockSRC20} from "../test/utils/mocks/MockSRC20.sol";
import {SRC20Multicall} from "../src/SRC20Multicall.sol";

contract DeployMultiToken is Script {
    uint256 constant NUM_TOKENS = 50;

    function run() public {
        uint256 deployerPrivkey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 alicePrivkey = vm.envUint("ALICE_PRIVATE_KEY");

        address alice = vm.addr(alicePrivkey);

        vm.startBroadcast(deployerPrivkey);

        // Deploy multicall contract
        SRC20Multicall multicall = new SRC20Multicall();
        console.log("SRC20Multicall deployed at:", address(multicall));

        // Deploy 50 tokens with different balances
        address[] memory tokenAddresses = new address[](NUM_TOKENS);

        for (uint256 i = 0; i < NUM_TOKENS; i++) {
            string memory name = string(abi.encodePacked("Token", vm.toString(i + 1)));
            string memory symbol = string(abi.encodePacked("TKN", vm.toString(i + 1)));

            MockSRC20 token = new MockSRC20(name, symbol, 18);

            // Mint different amounts to Alice: (i+1) * 1e18
            uint256 amount = (i + 1) * 1e18;
            token.mint(alice, suint256(amount));

            tokenAddresses[i] = address(token);
            console.log("Token deployed at:", address(token));
        }

        vm.stopBroadcast();

        // Log all token addresses for easy copying
        console.log("\n=== TOKEN ADDRESSES ===");
        for (uint256 i = 0; i < NUM_TOKENS; i++) {
            console.log(tokenAddresses[i]);
        }

        console.log("\n=== MULTICALL ADDRESS ===");
        console.log(address(multicall));
    }
}
