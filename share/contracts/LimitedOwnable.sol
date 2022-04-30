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
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libraries/CodeVerification.sol";
import "./libraries/Immutable.sol";
import "./SHARE.sol";

abstract contract LimitedOwnable is Ownable, ReentrancyGuard {
    string public constant VERSION = "1.0.0";
    CodeVerification.BuildType[] private _validBuildTypes;
    Immutable.Address internal _shareContractAddress;
    bool private _initialized;

    modifier afterInit() {
        require(_initialized, "SHARE014");
        _;
    }

    constructor(
        bool allowWallet_,
        bool allowSplit_,
        bool allowPFAUnit_,
        bool allowPFACollection_
    ) internal {
        require(tx.origin == msg.sender, "SHARE012");
        if (allowWallet_) {
            _validBuildTypes.push(CodeVerification.BuildType.WALLET);
        }

        if (allowSplit_) {
            _validBuildTypes.push(CodeVerification.BuildType.SPLIT);
        }

        if (allowPFAUnit_) {
            _validBuildTypes.push(CodeVerification.BuildType.PFA_UNIT);
        }

        if (allowPFACollection_) {
            _validBuildTypes.push(CodeVerification.BuildType.PFA_COLLECTION);
        }
        _transferOwnership(_msgSender());
    }

    function setInitialized() internal onlyOwner {
        _initialized = true;
    }

    function initialized() public view returns (bool) {
        return _initialized;
    }

    function setShareContractAddress(address address_) internal {
        Immutable.setAddress(_shareContractAddress, address_);
    }

    function shareContractAddress() internal view afterInit returns (address) {
        return _shareContractAddress.value;
    }

    function transferOwnership(address newOwner)
        public
        override
        onlyOwner
        afterInit
    {
        SHARE protocol = SHARE(shareContractAddress());
        bool ownerHasValidBuildType = false;
        for (uint256 i = 0; i < _validBuildTypes.length; i++) {
            if (protocol.isApprovedBuild(newOwner, _validBuildTypes[i])) {
                ownerHasValidBuildType = true;
                break;
            }
        }
        require(ownerHasValidBuildType, "SHARE002");
        require(
            newOwner != address(0),
            "Ownable: new owner is the zero address"
        );
        _transferOwnership(newOwner);
    }
}
