// SPDX-License-Identifier: UNLICENSED
// ⣿⣿⣿⣿⣿⠀⠀⣰⣿⣿⣿⣷⡀⠀⠀⣶⣶⣶⣦⡀⠀⠀⠀⣶⣶⡄⠀⠀⣶⣶⡆⠀⠀⣶⣶⠀⠀⠀⠀⢰⣶⣶⣶⣶⢀⠀⠀⣤⣶⣶⣦⡀⠀⠀⠀⣴⣶⣶⣦⠀
// ⣿⣿⠀⠀⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⠀⢻⣿⠀⠀⠀⣿⣿⣿⠀⢸⣿⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⢸⣿⡇⠀⣿⣿⠀⠀⣾⣿⠁⠈⣿⡇
// ⣿⣿⠀⠀⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⠀⣸⣿⠀⠀⠀⣿⣿⣿⡀⣿⡟⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⣿⣿⡀⠀⠀⠀⠀⠘⣿⣷⠀⠀⠀
// ⣿⣿⠿⠿⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⣿⣿⡟⠀⠀⠀⣿⣿⣿⣷⣿⠀⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡿⠿⠀⠀⠀⠀⠀⢿⣿⣦⠀⠀⠀⠀⠈⣿⣿⡄⠀
// ⣿⣿⠀⠀⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⠈⣿⣷⠀⠀⠀⣿⣿⢸⣿⣿⠈⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⢀⣀⠀⠙⣿⣧⠀⠀⣀⣀⠀⠻⣿⡆
// ⣿⣿⠀⠀⠀⠀⠀⢿⣿⣤⣾⣿⠇⠀⠀⣿⣿⠀⣿⣿⠀⠀⠀⣿⣿⠀⣿⡇⠈⣿⡇⠀⠀⣿⣿⣤⣤⡄⠀⢸⣿⣧⣤⣤⡄⠀⢸⣿⣆⠀⣿⣿⠀⠀⣿⣿⡀⢀⣿⣿
// ⠛⠛⠀⠀⠀⠀⠀⠈⠛⠿⠿⠛⠀⠀⠀⠛⠛⠀⠘⠛⠃⠀⠀⠛⠛⠀⠛⠀⠈⠛⠃⠀⠀⠛⠛⠛⠛⠃⠀⠘⠛⠛⠛⠛⠃⠀⠀⠙⠿⠿⠟⠁⠀⠀⠀⠛⠿⠿⠛⠀
// https://formless.xyz/opportunities
//
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Share Operator Registry contract.
/// @notice A living canonical registry of all SHARE protocol operator
/// EOAs (Externally Owned Accounts).
/// @author john-paul@formless.xyz
contract OperatorRegistry is Ownable, ReentrancyGuard {
    // Using OpenZeppelin's EnumerableSet utility for managing addresses
    using EnumerableSet for EnumerableSet.AddressSet;

    // Private set of operator addresses
    EnumerableSet.AddressSet private _operatorAddresses;

    /// @notice Initialize the contract with an initial set of operator addresses.
    /// @param shareOperatorsAddresses_ array of operator addresses to add to the registry initially
    function initialize(
        address[] memory shareOperatorsAddresses_
    ) public onlyOwner {
        for (uint256 i = 0; i < shareOperatorsAddresses_.length; i++) {
            _operatorAddresses.add(shareOperatorsAddresses_[i]);
        }
    }

    /// @notice Add a new verified operator to the registry.
    /// @param shareOperatorAddress_ the address of the operator to add.
    function addVerifiedOperator(
        address shareOperatorAddress_
    ) public onlyOwner {
        _operatorAddresses.add(shareOperatorAddress_);
    }

    /// @notice Remove a verified operator from the registry.
    /// @param shareOperatorAddress_ the address of the operator to remove.
    function removeVerifiedOperator(
        address shareOperatorAddress_
    ) public onlyOwner {
        _operatorAddresses.remove(shareOperatorAddress_);
    }

    /// @notice Provide funds to all registered operators. The funds sent with the transaction
    /// will be evenly distributed amongst all registered operators according to per operator
    /// amount.
    /// @param totalFunding_ This is the total eth sent during the call, that is appropriated
    /// for funding the operator addresses.
    /// @param fundingPerOperator_ This is the per operator allocation of funds that is calculated
    /// off-chain.
    function fundOperatorAddresses(
        uint256 totalFunding_,
        uint256 fundingPerOperator_
    ) public payable onlyOwner nonReentrant {
        require(msg.value == totalFunding_, "SHARE033");
        require(_operatorAddresses.length() > 0, "SHARE034");
        for (uint256 i = 0; i < _operatorAddresses.length(); i++) {
            (bool success, ) = payable(_operatorAddresses.at(i)).call{
                value: fundingPerOperator_
            }("");
            require(success, "SHARE036");
        }
    }

    function countOperatorAddresses() public view returns (uint256) {
        return _operatorAddresses.length();
    }

    /// @notice Check if a given address is a verified operator in the registry.
    /// @param address_ the address to check.
    /// @return true if the address is a verified operator, false otherwise.
    function isOperator(address address_) public view returns (bool) {
        return _operatorAddresses.contains(address_);
    }

    /// @notice List all of the operators in the current registry.
    /// @return array containing the operator addresses.
    function listOperatorAddresses() public view returns (address[] memory) {
        uint256 length = _operatorAddresses.length();
        address[] memory operators = _operatorAddresses.values();

        return operators;
    }
}
