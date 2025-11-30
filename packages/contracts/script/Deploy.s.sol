// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {IDirectory} from "../src/IDirectory.sol";
import {IIntelligence} from "../src/IIntelligence.sol";
import {MockSRC20} from "../test/utils/mocks/MockSRC20.sol";

contract Deploy is Script {
    function run() public {
        uint256 deployerPrivkey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 alicePrivkey = vm.envUint("ALICE_PRIVATE_KEY");
        suint256 intelligenceAESKey = suint256(
            vm.envUint("INTELLIGENCE_AES_KEY")
        );

        address deployer = vm.addr(deployerPrivkey);
        address alice = vm.addr(alicePrivkey);

        vm.startBroadcast(deployerPrivkey);
        IDirectory directory = IDirectory(
            address(0x1000000000000000000000000000000000000004)
        );
        directory.setKey(intelligenceAESKey);

        //     IIntelligence intelligence = IIntelligence(
        //         address(0x1000000000000000000000000000000000000005)
        //     );
        //     intelligence.addProvider(deployer);

        //     MockSRC20 token = new MockSRC20("Token", "TKN", 18);
        //     token.mint(alice, suint256(2e27));
        vm.stopBroadcast();
    }
}
