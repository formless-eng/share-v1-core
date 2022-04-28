// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0 <0.9.0;

interface IPFACollection {
    function contains(address account_) external view returns (bool);
}
