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

/// @title Contract which implements it can receive payment using ERC20 tokens including USDC
/// @author xiang@formless.xyz
abstract contract ERC20Payable is IERC20Payable {
    address internal _erc20ContractAddress;
    IERC20 internal _erc20Token;
    uint256 internal constant ERC20_PAYABLE_CALL_VALUE = 0;

    /// @notice Gets the ERC20 contract address used for payments.
    function getERC20ContractAddress() external view returns (address) {
        return _erc20ContractAddress;
    }

    function _setERC20ContractAddress(address contractAddress_) internal {
        require(
            contractAddress_ != address(0),
            "Invalid ERC20 contract address"
        );
        _erc20ContractAddress = contractAddress_;
        _erc20Token = IERC20(contractAddress_);
    }

    function isERC20Payable() public view returns (bool) {
        return _erc20ContractAddress != address(0);
    }

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
