// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {AesLib} from "../src/AesLib.sol";
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

        // suint256 aesKey = suint256(4808126964507126855406015480764155071141914500595441171764208570041907376684);
        // bytes memory encryptedAmount = hex"072a79329a14584fa48cb4a8f9d2e343bfc18e0a9964e81f2ca0a5da0e3f814fe8f65061a57f7dd8537902e643a64d0200000000000000000000003cf401dcfbfc5719ee4d26258f02f637d30fc1860ab52bc241c3495d2c7e11a790";
        // bytes memory decryptedAmount = intelligence.decrypt(aesKey, encryptedAmount);
        // (bytes memory ct, uint96 nce, bytes32 kh) = AesLib.parseEncryptedData(encryptedAmount);
        // console.log("HERE");
        // console.logBytes(ct);
        // console.logUint(uint256(nce));
        // console.logBytes32(kh);
        // console.log(bytesToUint(decryptedAmount));

        bytes[] memory encryptedData = intelligence.encrypt("1");
        console.logBytes(encryptedData[0]);

        bytes[] memory encryptedData2 = intelligence.encrypt("1");
        console.logBytes(encryptedData2[0]);

        bytes[] memory encryptedData3 = intelligence.encrypt("1");
        console.logBytes(encryptedData3[0]);

        console.log(address(intelligence));
    }
}
