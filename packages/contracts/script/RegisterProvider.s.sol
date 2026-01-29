// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

interface IDirectory {
    function setKey(suint256 _key) external;
    function checkHasKey(address _addr) external view returns (bool);
}

interface IIntelligence {
    function addProvider(address _provider) external;
    function numProviders() external view returns (uint256);
}

contract RegisterProvider is Script {
    address public constant DIRECTORY_ADDRESS = address(0x1000000000000000000000000000000000000004);
    address public constant INTELLIGENCE_ADDRESS = address(0x1000000000000000000000000000000000000005);

    function run() public {
        uint256 deployerPrivkey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 intelligenceAesKey = vm.envUint("INTELLIGENCE_AES_KEY");
        
        address deployer = vm.addr(deployerPrivkey);
        console.log("Deployer address:", deployer);

        IDirectory directory = IDirectory(DIRECTORY_ADDRESS);
        IIntelligence intelligence = IIntelligence(INTELLIGENCE_ADDRESS);

        vm.startBroadcast(deployerPrivkey);

        // Step 1: Register AES key in Directory
        console.log("Registering AES key in Directory...");
        directory.setKey(suint256(intelligenceAesKey));
        console.log("AES key registered!");

        // Step 2: Add deployer as provider in Intelligence
        console.log("Adding deployer as provider...");
        intelligence.addProvider(deployer);
        console.log("Provider added!");

        vm.stopBroadcast();

        console.log("Done! Provider registered successfully.");
    }
}
