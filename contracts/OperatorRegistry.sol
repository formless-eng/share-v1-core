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
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Share Operator Registry contract.
/// @notice A living canonical registry of all SHARE protocol operator
/// EOAs (Externally Owned Accounts).
/// @author john-paul@formless.xyz
contract OperatorRegistry is Ownable {
    // Using OpenZeppelin's EnumerableSet utility for managing addresses
    using EnumerableSet for EnumerableSet.AddressSet;

    // Private set of operator addresses
    EnumerableSet.AddressSet private _operatorAddresses;

    /// @notice Initialize the contract with an initial set of operator addresses.
    /// @param shareEOAOperators_ array of operator addresses to add to the registry initially
    function initialize(address[] memory shareEOAOperators_) public onlyOwner {
        for (uint256 i = 0; i < shareEOAOperators_.length; i++) {
            _operatorAddresses.add(shareEOAOperators_[i]);
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
    /// will be evenly distributed amongst all registered operators.
    function fundOperatorAddresses() public payable onlyOwner {
        require(msg.value > 0, "SHARE033");
        require(_operatorAddresses.length() > 0, "SHARE034");
        uint256 fundingPerOperator = msg.value / _operatorAddresses.length();
        for (uint256 i = 0; i < _operatorAddresses.length(); i++) {
            payable(_operatorAddresses.at(i)).transfer(fundingPerOperator);
        }
    }

    /// @notice Check if a given address is a verified operator in the registry.
    /// @param suspectedOperatorAddress_ the address to check.
    /// @return true if the address is a verified operator, false otherwise.
    function isOperator(
        address suspectedOperatorAddress_
    ) public view returns (bool) {
        return _operatorAddresses.contains(suspectedOperatorAddress_);
    }

    /// @notice List all of the operators in the current registry.
    /// @return array containing the operator addresses.
    function listOperatorRegistry() public view returns (address[] memory) {
        uint256 length = _operatorAddresses.length();
        address[] memory operators = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            operators[i] = _operatorAddresses.at(i);
        }
        return operators;
    }
}
