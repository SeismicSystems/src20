// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

import {Directory} from "../src/Directory.sol";

contract DirectoryTest is Test {
    Directory directory;

    function setUp() public {
        directory = new Directory();
    }

    function testGenKey() public {
        directory.genKey();
        assert(directory.checkHasKey(address(this)));
    }

    function test_RevertIfRequestWithoutGenerating() public {
        vm.expectRevert();
        directory.getKey();

        vm.expectRevert();
        directory.getKeyHash();
    }
}
