// SPDX-License-Identifier: UNLICENSED
// ⣿⣿⣿⣿⣿⠀⠀⣰⣿⣿⣿⣷⡀⠀⠀⣶⣶⣶⣦⡀⠀⠀⠀⣶⣶⡄⠀⠀⣶⣶⡆⠀⠀⣶⣶⠀⠀⠀⠀⢰⣶⣶⣶⣶⢀⠀⠀⣤⣶⣶⣦⡀⠀⠀⠀⣴⣶⣶⣦⠀
// ⣿⣿⠀⠀⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⠀⢻⣿⠀⠀⠀⣿⣿⣿⠀⢸⣿⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⢸⣿⡇⠀⣿⣿⠀⠀⣾⣿⠁⠈⣿⡇
// ⣿⣿⠀⠀⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⠀⣸⣿⠀⠀⠀⣿⣿⣿⡀⣿⡟⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⣿⣿⡀⠀⠀⠀⠀⠘⣿⣷⠀⠀⠀
// ⣿⣿⠿⠿⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⣿⣿⡟⠀⠀⠀⣿⣿⣿⣷⣿⠀⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡿⠿⠀⠀⠀⠀⠀⢿⣿⣦⠀⠀⠀⠀⠈⣿⣿⡄⠀
// ⣿⣿⠀⠀⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⠈⣿⣷⠀⠀⠀⣿⣿⢸⣿⣿⠈⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⢀⣀⠀⠙⣿⣧⠀⠀⣀⣀⠀⠻⣿⡆
// ⣿⣿⠀⠀⠀⠀⠀⢿⣿⣤⣾⣿⠇⠀⠀⣿⣿⠀⣿⣿⠀⠀⠀⣿⣿⠀⣿⡇⠈⣿⡇⠀⠀⣿⣿⣤⣤⡄⠀⢸⣿⣧⣤⣤⡄⠀⢸⣿⣆⠀⣿⣿⠀⠀⣿⣿⡀⢀⣿⣿
// ⠛⠛⠀⠀⠀⠀⠀⠈⠛⠿⠿⠛⠀⠀⠀⠛⠛⠀⠘⠛⠃⠀⠀⠛⠛⠀⠛⠀⠈⠛⠃⠀⠀⠛⠛⠛⠛⠃⠀⠘⠛⠛⠛⠛⠃⠀⠀⠙⠿⠿⠟⠁⠀⠀⠀⠛⠿⠿⠛⠀
// https://formless.xyz/opportunities
//⠀
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IERC20Payable.sol";

/// @title ERC20Payable - Contract for handling ERC20 token payments
/// @author xiang@formless.xyz
/// @notice Abstract contract that enables receiving payments in ERC20 tokens (e.g. USDC)
/// @dev Inherits from IERC20Payable interface
abstract contract ERC20Payable is IERC20Payable {
    address internal _erc20ContractAddress;
    IERC20 internal _erc20Token;
    uint256 internal constant ERC20_PAYABLE_CALL_VALUE = 0;

    /// @notice Retrieves the ERC20 token contract address used for payments
    /// @return address The contract address of the ERC20 token
    function getERC20ContractAddress() external view returns (address) {
        return _erc20ContractAddress;
    }

    /// @notice Sets the ERC20 token contract address for payments
    /// @param contractAddress_ The address of the ERC20 token contract
    /// @dev Initializes both the contract address and the IERC20 interface
    /// @dev Reverts if a zero address is provided
    function _setERC20ContractAddress(address contractAddress_) internal {
        require(
            contractAddress_ != address(0),
            "Invalid ERC20 contract address"
        );
        _erc20ContractAddress = contractAddress_;
        _erc20Token = IERC20(contractAddress_);
    }

    /// @notice Checks if the contract is configured to accept ERC20 payments
    /// @return bool True if ERC20 payments are enabled (contract address is set)
    function isERC20Payable() public view returns (bool) {
        return _erc20ContractAddress != address(0);
    }

    /// @notice Transfers tokens from owner to spender and approves subsequent spending
    /// @param tokenOwner_ Address of the token owner
    /// @param tokenSpender_ Address that will spend the tokens
    /// @param totalTokenAmount_ Total amount of tokens to transfer
    /// @param callableContractAddress_ Contract address that will be approved to spend tokens
    /// @param callableTokenAmount_ Amount of tokens to approve for spending
    /// @dev Error codes:
    ///      SHARE050: Insufficient allowance
    ///      SHARE048: Transfer failed
    ///      SHARE049: Approval failed
    function _transferERC20ThenApprove(
        address tokenOwner_,
        address tokenSpender_,
        uint256 totalTokenAmount_,
        address callableContractAddress_,
        uint256 callableTokenAmount_
    ) internal {
        require(
            _erc20Token.allowance(tokenOwner_, tokenSpender_) >=
                totalTokenAmount_,
            "SHARE050"
        );
        require(
            _erc20Token.transferFrom(
                tokenOwner_,
                tokenSpender_,
                totalTokenAmount_
            ),
            "SHARE048"
        );
        require(
            _erc20Token.approve(callableContractAddress_, callableTokenAmount_),
            "SHARE049"
        );
    }

    /// @notice Transfers tokens from message sender to a recipient
    /// @param tokenRecipient_ Address that will receive the tokens
    /// @param tokenAmount_ Amount of tokens to transfer
    /// @dev Error codes:
    ///      SHARE050: Insufficient allowance
    ///      SHARE048: Transfer failed
    function _transferERC20FromSender(
        address tokenRecipient_,
        uint256 tokenAmount_
    ) internal {
        require(
            _erc20Token.allowance(msg.sender, address(this)) >= tokenAmount_,
            "SHARE050"
        );
        require(
            _erc20Token.transferFrom(msg.sender, tokenRecipient_, tokenAmount_),
            "SHARE048"
        );
    }
}
