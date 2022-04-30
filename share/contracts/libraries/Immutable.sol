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

/// @notice Library for contracts to implement write-once
/// post initialization immutable variables. This enables immutable
/// variables that are not initialized in Solidity constructors.
/// @dev Assumes users of the `Immutable` library perform writes using
/// the setters exposed in this contract and not by directly
/// accessing the underlying state variables.
library Immutable {
    string public constant VERSION = "1.0.0";

    struct UnsignedInt256 {
        uint256 value;
        bool locked;
    }

    struct Address {
        address value;
        bool locked;
    }

    struct Boolean {
        bool value;
        bool locked;
    }

    struct AddressArray {
        address[] value;
        bool locked;
    }

    struct AddressToBooleanMap {
        mapping(address => bool) value;
        bool locked;
    }

    /// @notice Sets the value of a uint256 and locks it such
    /// that subsequent attempts to write revert.
    function setUnsignedInt256(UnsignedInt256 storage object, uint256 value)
        public
    {
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
