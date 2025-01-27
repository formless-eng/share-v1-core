// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0 <0.9.0;

/**
 * @title IERC20Payable
 * @dev Interface for contracts that can receive ERC20 token payments
 */
interface IERC20Payable {
    /**
     * @notice Gets the ERC20 contract address used for payments
     * @return The address of the configured ERC20 token contract
     */
    function getERC20ContractAddress() external view returns (address);

    /**
     * @notice Checks if the contract is configured to accept ERC20 payments
     * @return True if an ERC20 contract address is set, false otherwise
     */
    function isERC20Payable() external view returns (bool);
}
