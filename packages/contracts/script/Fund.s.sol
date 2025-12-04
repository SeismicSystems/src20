// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

contract Fund is Script {
    function run() public {
        uint256 miniFaucetPrivkey = vm.envUint("MINI_FAUCET_PRIVATE_KEY");
        uint256 deployerPrivkey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 alicePrivkey = vm.envUint("ALICE_PRIVATE_KEY");
        uint256 bobPrivkey = vm.envUint("BOB_PRIVATE_KEY");
        uint256 charliePrivkey = vm.envUint("CHARLIE_PRIVATE_KEY");

        vm.startBroadcast(miniFaucetPrivkey);
        address deployer = vm.addr(deployerPrivkey);
        payable(deployer).transfer(1 ether);

        address alice = vm.addr(alicePrivkey);
        payable(alice).transfer(1 ether);

        address bob = vm.addr(bobPrivkey);
        payable(bob).transfer(1 ether);

        address charlie = vm.addr(charliePrivkey);
        payable(charlie).transfer(1 ether);
        vm.stopBroadcast();
    }
}
