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

/// @title Immutable state variable library.
/// @author brandon@formless.xyz
/// @notice Library for contracts to implement write-once
/// post initialization immutable variables. This enables immutable
/// variables that are not initialized in Solidity constructors.
/// By not using parameterized constructors, stable construction
/// parameter invariant runtime bytecode can be generated for the
/// _source code_ associated with all SHARE contracts.
/// @dev Assumes users of the `Immutable` library perform writes using
/// the setters exposed in this contract and not by directly
/// accessing the underlying state variables.
library Immutable {
    string public constant VERSION = "1.0.0";

    /// @notice Lockable uint256 type. Write-once state variable
    /// that does not use the Solidity `immutable` keyword.
    struct UnsignedInt256 {
        uint256 value;
        bool locked;
    }

    /// @notice Lockable address type. Write-once state variable
    /// that does not use the Solidity `immutable` keyword.
    struct Address {
        address value;
        bool locked;
    }

    /// @notice Lockable bool type. Write-once state variable
    /// that does not use the Solidity `immutable` keyword.
    struct Boolean {
        bool value;
        bool locked;
    }

    /// @notice Lockable address[] type. Write-once state variable
    /// that does not use the Solidity `immutable` keyword.
    struct AddressArray {
        address[] value;
        bool locked;
    }

    /// @notice Lockable uint256[] type. Write-once state variable
    /// that does not use the Solidity `immutable` keyword.
    struct UnsignedInt256Array {
        uint256[] value;
        bool locked;
    }

    /// @notice Lockable mapping(address => bool) type. Write-once state variable
    /// that does not use the Solidity `immutable` keyword.
    struct AddressToBooleanMap {
        mapping(address => bool) value;
        bool locked;
    }

    /// @notice Sets the value of a uint256 and locks it such
    /// that subsequent attempts to write revert.
    function setUnsignedInt256(
        UnsignedInt256 storage object,
        uint256 value
    ) public {
        require(!object.locked, "SHARE003");
        object.value = value;
        object.locked = true;
    }

    /// @notice Sets the value of an address and locks it such
    /// that subsequent attempts to write revert.
    function setAddress(Address storage object, address value) public {
        require(!object.locked, "SHARE003");
        object.value = value;
        object.locked = true;
    }

    /// @notice Sets the value of a bool and locks it such
    /// that subsequent attempts to write revert.
    function setBoolean(Boolean storage object, bool value) public {
        require(!object.locked, "SHARE003");
        object.value = value;
        object.locked = true;
    }

    /// @notice Pushes an address value onto an address array. Once
    /// the associated lock for the array is set, subsequent attempts
    /// to push revert.
    function pushAddress(AddressArray storage object, address value) public {
        require(!object.locked, "SHARE003");
        object.value.push(value);
    }

    /// @notice Pushes an unsigned 256 integer value onto an unsigned 256
    /// integer array. Once the associated lock for the array is set,
    /// subsequent attempts to push revert.
    function pushUnsignedInt256(
        UnsignedInt256Array storage object,
        uint256 value
    ) public {
        require(!object.locked, "SHARE003");
        object.value.push(value);
    }

    /// @notice Inserts an address : bool pair into a map. Once
    /// the associated lock for the map is set, subsequent attempts
    /// to insert revert.
    function insertBooleanAtAddress(
        AddressToBooleanMap storage object,
        address address_,
        bool value
    ) public {
        require(!object.locked, "SHARE003");
        object.value[address_] = value;
    }
}
