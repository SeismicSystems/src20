// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.13;

import {DSTestPlus} from "./utils/DSTestPlus.sol";
import {SRC20} from "../src/SRC20.sol";
import {SRC20Multicall} from "../src/SRC20Multicall.sol";

contract TestSRC20 is SRC20 {
    constructor(string memory _name, string memory _symbol, uint8 _decimals)
        SRC20(_name, _symbol, _decimals)
    {}

    function mint(address to, uint256 amount) public {
        _mint(to, suint256(amount));
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply();
    }
}

contract BatchReadTest is DSTestPlus {
    SRC20Multicall multicall;
    TestSRC20[] tokens;

    uint256 constant USER_PRIVATE_KEY = 0xBEEF;
    address user;

    uint256 constant NUM_TOKENS = 10;

    function setUp() public {
        user = hevm.addr(USER_PRIVATE_KEY);

        multicall = new SRC20Multicall();

        // Deploy 10 tokens with different balances
        for (uint256 i = 0; i < NUM_TOKENS; i++) {
            TestSRC20 token = new TestSRC20("Token", "TKN", 18);
            token.mint(user, (i + 1) * 1e18);
            tokens.push(token);
        }
    }

    function _tokenAddresses() internal view returns (address[] memory addrs) {
        addrs = new address[](NUM_TOKENS);
        for (uint256 i = 0; i < NUM_TOKENS; i++) {
            addrs[i] = address(tokens[i]);
        }
    }

    function _signBalanceRead(uint256 privateKey, address owner, uint256 expiry)
        internal
        returns (bytes memory)
    {
        bytes32 messageHash = keccak256(abi.encodePacked("SRC20_BALANCE_READ", owner, expiry));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = hevm.sign(privateKey, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }

    // --- Single token signed read ---

    function test_singleSignedRead() public {
        uint256 expiry = block.timestamp + 1 hours;
        bytes memory sig = _signBalanceRead(USER_PRIVATE_KEY, user, expiry);

        uint256 bal = tokens[0].balanceOfSigned(user, expiry, sig);
        assertEq(bal, 1e18);
    }

    // --- Batch read of 10 tokens ---

    function test_batchReadTenTokens() public {
        uint256 expiry = block.timestamp + 1 hours;
        bytes memory sig = _signBalanceRead(USER_PRIVATE_KEY, user, expiry);

        uint256[] memory balances = multicall.batchBalances(user, _tokenAddresses(), expiry, sig);

        assertEq(balances.length, NUM_TOKENS);
        for (uint256 i = 0; i < NUM_TOKENS; i++) {
            assertEq(balances[i], (i + 1) * 1e18);
        }
    }

    // --- Expired signature reverts ---

    function test_revertExpiredSignature() public {
        uint256 expiry = block.timestamp + 1 hours;
        bytes memory sig = _signBalanceRead(USER_PRIVATE_KEY, user, expiry);

        // Warp past expiry
        hevm.warp(expiry + 1);

        hevm.expectRevert("signature expired");
        tokens[0].balanceOfSigned(user, expiry, sig);
    }

    // --- Invalid signature reverts ---

    function test_revertInvalidSignature() public {
        uint256 expiry = block.timestamp + 1 hours;
        uint256 wrongKey = 0xDEAD;
        bytes memory sig = _signBalanceRead(wrongKey, user, expiry);

        hevm.expectRevert("invalid signature");
        tokens[0].balanceOfSigned(user, expiry, sig);
    }

    // --- Self read still works ---

    function test_selfBalanceRead() public {
        hevm.prank(user);
        assertEq(tokens[0].balance(), 1e18);
    }

    // --- Signature reuse until expiry ---

    function test_signatureReuse() public {
        uint256 expiry = block.timestamp + 1 hours;
        bytes memory sig = _signBalanceRead(USER_PRIVATE_KEY, user, expiry);

        // Same sig works across different tokens
        assertEq(tokens[0].balanceOfSigned(user, expiry, sig), 1e18);
        assertEq(tokens[4].balanceOfSigned(user, expiry, sig), 5e18);
        assertEq(tokens[9].balanceOfSigned(user, expiry, sig), 10e18);
    }

    // --- Expiry boundary (timestamp == expiry is valid) ---

    function test_expiryBoundary() public {
        uint256 expiry = block.timestamp + 1 hours;
        bytes memory sig = _signBalanceRead(USER_PRIVATE_KEY, user, expiry);

        // Warp to exactly expiry - should still work
        hevm.warp(expiry);
        uint256 bal = tokens[0].balanceOfSigned(user, expiry, sig);
        assertEq(bal, 1e18);

        // Warp 1 second past - should fail
        hevm.warp(expiry + 1);
        hevm.expectRevert("signature expired");
        tokens[0].balanceOfSigned(user, expiry, sig);
    }
}
