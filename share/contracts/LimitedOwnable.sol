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

/// @title Limited ownable abstract base contract.
/// @author brandon@formless.xyz
/// @notice Contracts which derive from the abstract LimitedOwnable
/// base contract have limitations on owners. At construction time
/// contract creators may specify valid owner classes, e.g. one of:
///
/// `CodeVerification.BuildType.WALLET`
/// `CodeVerification.BuildType.SPLIT`
///
/// Wallets are those addresses which have a code hash that is either /// an externally owned account (EOA) or an approved wallet code hash /// stored in the Share protocol contract. Splits are those
/// addresses which correspond to approved builds of Share
/// royalty split contract implementations. LimitedOwnable contract
/// creators must be EOAs to prevent arbitrary contracts from
/// establishing initial ownership.
/// @dev LimitedOwnables limit potential risk associated with
/// sending ether to contract owners, particulary where it is
/// critical that the caller complete a state transition and not
/// revert during the call.
abstract contract LimitedOwnable is Ownable, ReentrancyGuard {
    string public constant VERSION = "1.0.0";
    CodeVerification.BuildType[] private _validBuildTypes;
    Immutable.Address internal _shareContractAddress;
    bool private _initialized;

    modifier afterInit() {
        require(_initialized, "SHARE014");
        _;
    }

    constructor(bool allowWallet_, bool allowSplit_) internal {
        // Note that we do not use tx.origin here for authorization,
        // only to assert that the sender is an EOA, independent of
        // the address of the EOA.
        require(tx.origin == msg.sender, "SHARE012");
        if (allowWallet_) {
            _validBuildTypes.push(CodeVerification.BuildType.WALLET);
        }

        if (allowSplit_) {
            _validBuildTypes.push(CodeVerification.BuildType.SPLIT);
        }

        _transferOwnership(_msgSender());
    }

    /// @notice Sets the contract state to initialized.
    /// @dev Functions with the modifer `afterInit` will revert if
    /// called before initialized is set to true in this contract.
    function setInitialized() internal onlyOwner {
        _initialized = true;
    }

    /// @notice Returns true if and only if the contract has been
    /// initialized by invoking the `initialize` function.
    function initialized() public view returns (bool) {
        return _initialized;
    }

    /// @notice Sets the address of the SHARE protocol contract.
    /// @dev Used to verify approved runtime bytecode keccak256
    /// hashes.
    function setShareContractAddress(address address_) internal {
        Immutable.setAddress(_shareContractAddress, address_);
    }

    /// @notice Returns the address of the SHARE protocol contract.
    function shareContractAddress() internal view afterInit returns (address) {
        return _shareContractAddress.value;
    }

    /// @notice Transfers ownership of the contract to `newOwner` if
    /// and only if `newOwner` satisfies the limited ownership
    /// requirements established in the constructor, otherwise,
    /// reverts the transaction.
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
