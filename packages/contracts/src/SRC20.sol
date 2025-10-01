// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.13;

import {ERC20} from "solmate/tokens/ERC20.sol";

import {IIntelligence} from "./IIntelligence.sol";

/// @notice Modern ERC20 + EIP-2612 implementation with confidential balances and transfers.
/// @author Modified from Solmate (https://github.com/transmissions11/solmate/blob/main/src/tokens/ERC20.sol)
/// @author Modified from Uniswap (https://github.com/Uniswap/uniswap-v2-core/blob/master/contracts/UniswapV2ERC20.sol)
/// @dev Do not manually set balances without updating totalSupply, as the sum of all user balances must not exceed it.
abstract contract SRC20 {
    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event Transfer(address indexed from, address indexed to, bytes32 indexed encryptKeyHash, bytes encryptedAmount);

    event Approval(
        address indexed owner, address indexed spender, bytes32 indexed encryptKeyHash, bytes encryptedAmount
    );

    /*//////////////////////////////////////////////////////////////
                            METADATA STORAGE
    //////////////////////////////////////////////////////////////*/

    string public name;

    string public symbol;

    uint8 public immutable decimals;

    /*//////////////////////////////////////////////////////////////
                              SRC20 STORAGE
    //////////////////////////////////////////////////////////////*/

    IIntelligence public immutable intelligence;

    suint256 internal totalSupply;

    mapping(address => suint256) internal balanceOf;

    mapping(address => mapping(address => suint256)) internal allowance;

    /*//////////////////////////////////////////////////////////////
                            EIP-2612 STORAGE
    //////////////////////////////////////////////////////////////*/

    uint256 internal immutable INITIAL_CHAIN_ID;

    bytes32 internal immutable INITIAL_DOMAIN_SEPARATOR;

    mapping(address => uint256) public nonces;

    /*//////////////////////////////////////////////////////////////
                               CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _intelligence, string memory _name, string memory _symbol, uint8 _decimals) {
        intelligence = IIntelligence(_intelligence);

        name = _name;
        symbol = _symbol;
        decimals = _decimals;

        INITIAL_CHAIN_ID = block.chainid;
        INITIAL_DOMAIN_SEPARATOR = computeDomainSeparator();
    }

    /*//////////////////////////////////////////////////////////////
                               SRC20 LOGIC
    //////////////////////////////////////////////////////////////*/

    function approve(address spender, suint256 amount) public virtual returns (bool) {
        allowance[msg.sender][spender] = amount;

        emitApprovalEncrypted(msg.sender, spender, amount);

        return true;
    }

    function transfer(address to, suint256 amount) public virtual returns (bool) {
        balanceOf[msg.sender] -= amount;

        // Cannot overflow because the sum of all user
        // balances can't exceed the max uint256 value.
        unchecked {
            balanceOf[to] += amount;
        }

        emitTransferEncrypted(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, suint256 amount) public virtual returns (bool) {
        suint256 allowed = allowance[from][msg.sender]; // Saves gas for limited approvals.

        if (allowed != type(suint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }

        balanceOf[from] -= amount;

        // Cannot overflow because the sum of all user
        // balances can't exceed the max uint256 value.
        unchecked {
            balanceOf[to] += amount;
        }

        emitTransferEncrypted(from, to, amount);
        return true;
    }

    /*//////////////////////////////////////////////////////////////
                             EIP-2612 LOGIC
    //////////////////////////////////////////////////////////////*/

    function permit(address owner, address spender, suint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
        public
        virtual
    {
        require(deadline >= block.timestamp, "PERMIT_DEADLINE_EXPIRED");

        // Unchecked because the only math done is incrementing
        // the owner's nonce which cannot realistically overflow.
        unchecked {
            address recoveredAddress = ecrecover(
                keccak256(
                    abi.encodePacked(
                        "\x19\x01",
                        DOMAIN_SEPARATOR(),
                        keccak256(
                            abi.encode(
                                keccak256(
                                    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                                ),
                                owner,
                                spender,
                                value,
                                nonces[owner]++,
                                deadline
                            )
                        )
                    )
                ),
                v,
                r,
                s
            );

            require(recoveredAddress != address(0) && recoveredAddress == owner, "INVALID_SIGNER");

            allowance[recoveredAddress][spender] = value;
        }

        emitApprovalEncrypted(owner, spender, value);
    }

    function DOMAIN_SEPARATOR() public view virtual returns (bytes32) {
        return block.chainid == INITIAL_CHAIN_ID ? INITIAL_DOMAIN_SEPARATOR : computeDomainSeparator();
    }

    function computeDomainSeparator() internal view virtual returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    /*//////////////////////////////////////////////////////////////
                            EMIT EVENTS
    //////////////////////////////////////////////////////////////*/

    function emitTransferEncrypted(address from, address to, suint256 amount) internal {
        (bytes32[] memory encryptKeyHashes, bytes[] memory encryptedData) =
            intelligence.encrypt(abi.encodePacked(amount));
        for (uint256 i = 0; i < encryptedData.length; i++) {
            emit Transfer(from, to, encryptKeyHashes[i], encryptedData[i]);
        }
    }

    function emitApprovalEncrypted(address owner, address spender, suint256 amount) internal {
        (bytes32[] memory encryptKeyHashes, bytes[] memory encryptedData) =
            intelligence.encrypt(abi.encodePacked(amount));
        for (uint256 i = 0; i < encryptedData.length; i++) {
            emit Approval(owner, spender, encryptKeyHashes[i], encryptedData[i]);
        }
    }

    /*//////////////////////////////////////////////////////////////
                           READ FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function balance() public view virtual returns (uint256) {
        return uint256(balanceOf[msg.sender]);
    }

    function allowanceOf(address spender) public view virtual returns (uint256) {
        return uint256(allowance[msg.sender][spender]);
    }

    function _totalSupply() internal virtual returns (uint256) {
        return uint256(totalSupply);
    }

    /*//////////////////////////////////////////////////////////////
                          MINT/BURN LOGIC
    //////////////////////////////////////////////////////////////*/

    function _mint(address to, suint256 amount) internal virtual {
        totalSupply += amount;

        // Cannot overflow because the sum of all user
        // balances can't exceed the max uint256 value.
        unchecked {
            balanceOf[to] += amount;
        }

        emitTransferEncrypted(address(0), to, amount);
    }

    function _burn(address from, suint256 amount) internal virtual {
        balanceOf[from] -= amount;

        // Cannot underflow because a user's balance
        // will never be larger than the total supply.
        unchecked {
            totalSupply -= amount;
        }

        emitTransferEncrypted(from, address(0), amount);
    }
}
