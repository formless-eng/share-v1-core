// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ERC20Payable.sol";
import "./OperatorRegistry.sol";

/// @title ExecutionVault
/// @notice Holds payment liquidity while registered operators execute protocol calls.
contract ExecutionVault is Ownable, ReentrancyGuard, ERC20Payable {
    using SafeERC20 for IERC20;

    OperatorRegistry private _shareOperatorRegistry;
    bool private _initialized;

    event AccessExecuted(
        address indexed operator,
        address indexed contractAddress,
        address indexed recipient,
        uint256 tokenId,
        uint256 value
    );
    event Approval(address indexed spender, uint256 amount);
    event USDCWithdrawn(address indexed recipient, uint256 amount);

    modifier onlyOwnerOrOperator() {
        require(
            msg.sender == owner() ||
                _shareOperatorRegistry.isOperator(msg.sender),
            "SHARE030"
        );
        _;
    }

    /// @notice Configures the operator registry and USDC contract exactly once.
    function initialize(
        address operatorRegistryAddress_,
        address usdcContractAddress_
    ) external onlyOwner {
        require(!_initialized, "SHARE040");
        require(operatorRegistryAddress_ != address(0), "SHARE058");
        _shareOperatorRegistry = OperatorRegistry(operatorRegistryAddress_);
        _setERC20ContractAddress(usdcContractAddress_);
        _initialized = true;
    }

    /// @notice Calls `access` on a protocol contract using liquidity held here.
    function access(
        address contractAddress_,
        uint256 tokenId_,
        address recipient_
    ) external payable nonReentrant onlyOwnerOrOperator {
        require(_initialized, "SHARE041");
        require(contractAddress_.code.length > 0, "SHARE059");
        require(recipient_ != address(0), "SHARE060");

        (bool success, bytes memory returnData) = contractAddress_.call{
            value: msg.value
        }(abi.encodeWithSignature("access(uint256,address)", tokenId_, recipient_));
        if (!success) {
            assembly {
                revert(add(returnData, 32), mload(returnData))
            }
        }

        emit AccessExecuted(
            msg.sender,
            contractAddress_,
            recipient_,
            tokenId_,
            msg.value
        );
    }

    /// @notice Approves the configured USDC contract for a protocol payment.
    /// @dev The token parameter makes accidental approvals against the wrong deployment fail.
    function approve(
        address tokenAddress_,
        address spenderAddress_,
        uint256 amount_
    ) external onlyOwnerOrOperator {
        require(_initialized, "SHARE041");
        require(tokenAddress_ == _erc20ContractAddress, "SHARE061");
        require(spenderAddress_ != address(0), "SHARE060");
        _erc20Token.forceApprove(spenderAddress_, amount_);
        emit Approval(spenderAddress_, amount_);
    }

    /// @notice Withdraws the vault's complete USDC balance to its owner.
    function withdrawUSDC() external nonReentrant onlyOwner {
        require(_initialized, "SHARE041");
        uint256 balance = _erc20Token.balanceOf(address(this));
        _erc20Token.safeTransfer(owner(), balance);
        emit USDCWithdrawn(owner(), balance);
    }
}
