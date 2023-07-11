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

import "./libraries/Immutable.sol";
import "./LimitedOwnable.sol";

/// @title Swift Rotating Royalty Distributor (S2RD).
/// @author brandon@formless.xyz
/// @notice This contract implements efficient royalty splitting by
/// shuffling recipients off chain into a random distribution and
/// dealing transactions to those recipients on-chain atomically, e.g.
/// royalties are "dealt" in a rotating fashion rather than "split".
/// This results in immense gas savings and as the number of
/// transactions approaches infinity the delta between revenue
/// received and revenue owed by each recipient approaches zero.
contract S2RD is LimitedOwnable {
    /// @notice Emitted when a payment is sent to a stakeholder
    /// listed within this royalty distribution contract.
    event Payment(
        address indexed from,
        address indexed recipient,
        uint256 indexed addressIndex,
        uint256 value
    );

    uint256 public constant MAX_SPLIT_COUNT = 200;
    Immutable.AddressArray private _addresses;
    uint256 private _currentAddressIndex = 0;

    constructor()
        public
        LimitedOwnable(
            true, /* WALLET */
            false /* SPLIT */
        )
    {}

    /// @notice Initializes this contract.
    /// @dev Recipient address table is constructed off-chain and is
    /// constructed as follows:
    /// 1. A number of slots are allocated in an array corresponding
    /// to 1 / minimum percentage of any stakeholder in this asset.
    /// 2. Addresses are assigned to slots such that the probability
    /// of an iterator pointing to a given address is equal to that
    /// address's ownership stake in the asset.
    /// 3. Additionally, the layout specified in (2) is randomized
    /// such that primary stakeholders have no advantage in payment
    /// time given that the iterator increments linearly through the
    /// address table.
    function initialize(
        address[] memory addresses_,
        address shareContractAddress_
    ) public onlyOwner {
        require(addresses_.length <= MAX_SPLIT_COUNT, "SHARE006");
        require(addresses_.length >= 1, "SHARE020");
        setShareContractAddress(shareContractAddress_);
        SHARE protocol = SHARE(shareContractAddress_);
        for (uint256 i = 0; i < addresses_.length; i++) {
            // All addresses in the table are SHARE approved wallets,
            // e.g. EOAs or wallets with approved code hashes.
            require(
                protocol.isApprovedBuild(
                    addresses_[i],
                    CodeVerification.BuildType.WALLET
                ),
                "SHARE007"
            );
            Immutable.pushAddress(_addresses, addresses_[i]);
        }
        _addresses.locked = true;
        setInitialized();
    }

    /// @notice Returns the index of the address in the table which
    /// is the next address to receive payment on the reception of
    /// ether by this contract.
    function addressIndex() public view afterInit returns (uint256) {
        return _currentAddressIndex;
    }

    /// @notice Receives ether and distributes it among stakeholders
    /// specified in this contract using the S2RD method described
    /// above.
    receive() external payable nonReentrant afterInit {
        address recipient = _addresses.value[_currentAddressIndex];
        emit Payment(msg.sender, recipient, _currentAddressIndex, msg.value);
        _currentAddressIndex =
            (_currentAddressIndex + 1) %
            (_addresses.value.length);
        payable(recipient).transfer(msg.value); // max 2300 gas
    }

    /// @notice Reclaims a contract owned by this S2RD, e.g. if a PFA
    /// is owned by this split, the split owner may transfer
    /// ownership of the PFA back to their account. This is intended
    /// for maintenance purposes, e.g. the ability for S2RD owners to
    /// update tokenURIs and prices of PFAs, after which they may
    /// transfer (restore) ownership of the PFA back to the S2RD.
    ///
    /// 1: init  | 2:reclaim | 3: maintain | 4: restore
    /// -----------------------------------------------
    /// [Owner]     [Owner]     [Owner]     [Owner]
    ///   |            |           |           |
    ///   |            |           |           |
    ///   |            |           |           |
    /// [S2RD]       [PFA]       calls       [S2RD]
    ///   |                  setTokenURI()     |
    ///   |                                    |
    ///   |                                    |
    /// [PFA]                                [PFA]
    function reclaim(address contractAddress_)
        public
        afterInit
        onlyOwner
        nonReentrant
    {
        Ownable asset = Ownable(contractAddress_);
        require(asset.owner() == address(this), "SHARE025");
        asset.transferOwnership(msg.sender);
    }
}
