// SPDX-License-Identifier: UNLICENSED
// ⣿⣿⣿⣿⣿⠀⠀⣰⣿⣿⣿⣷⡀⠀⠀⣶⣶⣶⣦⡀⠀⠀⠀⣶⣶⡄⠀⠀⣶⣶⡆⠀⠀⣶⣶⠀⠀⠀⠀⢰⣶⣶⣶⣶⢀⠀⠀⣤⣶⣶⣦⡀⠀⠀⠀⣴⣶⣶⣦⠀
// ⣿⣿⠀⠀⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⠀⢻⣿⠀⠀⠀⣿⣿⣿⠀⢸⣿⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⢸⣿⡇⠀⣿⣿⠀⠀⣾⣿⠁⠈⣿⡇
// ⣿⣿⠀⠀⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⠀⣸⣿⠀⠀⠀⣿⣿⣿⡀⣿⡟⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⣿⣿⡀⠀⠀⠀⠀⠘⣿⣷⠀⠀⠀
// ⣿⣿⠿⠿⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⣿⣿⡟⠀⠀⠀⣿⣿⣿⣷⣿⠀⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡿⠿⠀⠀⠀⠀⠀⢿⣿⣦⠀⠀⠀⠀⠈⣿⣿⡄⠀
// ⣿⣿⠀⠀⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⠈⣿⣷⠀⠀⠀⣿⣿⢸⣿⣿⠈⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⢀⣀⠀⠙⣿⣧⠀⠀⣀⣀⠀⠻⣿⡆
// ⣿⣿⠀⠀⠀⠀⠀⢿⣿⣤⣾⣿⠇⠀⠀⣿⣿⠀⣿⣿⠀⠀⠀⣿⣿⠀⣿⡇⠈⣿⡇⠀⠀⣿⣿⣤⣤⡄⠀⢸⣿⣧⣤⣤⡄⠀⢸⣿⣆⠀⣿⣿⠀⠀⣿⣿⡀⢀⣿⣿
// ⠛⠛⠀⠀⠀⠀⠀⠈⠛⠿⠿⠛⠀⠀⠀⠛⠛⠀⠘⠛⠃⠀⠀⠛⠛⠀⠛⠀⠈⠛⠃⠀⠀⠛⠛⠛⠛⠃⠀⠘⠛⠛⠛⠛⠃⠀⠀⠙⠿⠿⠟⠁⠀⠀⠀⠛⠿⠿⠛⠀
pragma solidity >=0.8.0 <0.9.0;

import "../libraries/Immutable.sol";

contract MockImmutable {
    Immutable.UnsignedInt256 public _mockUnsignedInt256;
    Immutable.Address public _mockAddress;
    Immutable.Boolean public _mockBoolean;
    Immutable.AddressArray public _mockAddressArray;
    Immutable.AddressToBooleanMap public _mockAddressToBooleanMap;

    function setMockUnsignedInt256(uint256 value) public {
        Immutable.setUnsignedInt256(_mockUnsignedInt256, value);
    }

    function getMockUnsignedInt256() public view returns (uint256) {
        return _mockUnsignedInt256.value;
    }

    function setMockAddress(address value) public {
        Immutable.setAddress(_mockAddress, value);
    }

    function getMockAddress() public view returns (address) {
        return _mockAddress.value;
    }

    function setMockBoolean(bool value) public {
        Immutable.setBoolean(_mockBoolean, value);
    }

    function getMockBoolean() public view returns (bool) {
        return _mockBoolean.value;
    }

    function pushToMockAddressArray(address value) public {
        Immutable.pushAddress(_mockAddressArray, value);
    }

    function getMockAddressArray() public view returns (address[] memory) {
        return _mockAddressArray.value;
    }

    function lockMockAddressArray() public {
        _mockAddressArray.locked = true;
    }

    function insertIntoMockAddressToBooleanMap(address address_, bool value)
        public
    {
        Immutable.insertBooleanAtAddress(
            _mockAddressToBooleanMap,
            address_,
            value
        );
    }

    function getMockAddressToBooeanMapValue(address address_)
        public
        view
        returns (bool)
    {
        return _mockAddressToBooleanMap.value[address_];
    }

    function lockMockAddressToBooleanMap() public {
        _mockAddressToBooleanMap.locked = true;
    }
}
