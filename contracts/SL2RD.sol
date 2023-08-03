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

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./libraries/Immutable.sol";
import "./LimitedOwnable.sol";
import "./ShareOperatorRegistry.sol";

/// @title Swift Liquid Rotating Royalty Distributor (SL2RD).
/// @author john-paul@formless.xyz
/// @notice This contract implements efficient liquid royalty splitting
/// by shuffling recipient tokenIds off chain into a random distribution
/// and dealing transactions to those recipient slot NFTs atomically, e.g.
/// royalties are "dealt" in a rotating fashion rather than "split". This
/// results in immense gas savings and as the number of transactions
/// approaches infinity the delta between revenue received and revenue owed
/// by each recipient approaches zero.
contract SL2RD is
    LimitedOwnable,
    ERC721("Swift Liquid Rotating Royalty Distributor", "SL2RD")
{
    /// @notice Emitted when a payment is sent to a stakeholder
    /// slot listed within this royalty distribution contract.
    event Payment(
        address indexed from,
        address indexed recipient,
        uint256 indexed tokenIndex,
        uint256 value
    );
    event MintingToken(uint256 indexed tokenId, address indexed toAddress);

    uint256 public constant MAX_SPLIT_COUNT = 1000;
    Immutable.UnsignedInt256 private _totalSlots;
    Immutable.Unsigned256IntArray private _tokenIds;
    Immutable.AddressArray private _addresses;
    Immutable.UnsignedInt256 private _communitySplitsPercentage;
    Immutable.Address private _operatorRegistryAddress;
    uint256 private _totalCommunitySlots = 0;
    uint256 private _nextAvailableCommunitySlot = 0;
    uint256 private _currentTokenIdIndex = 0;
    mapping(uint256 => address) private _tokenOwners;
    mapping(uint256 => uint256) private _transferTimestamps;

    ShareOperatorRegistry private _shareOperatorRegistry;
    SHARE private _protocol;

    /// @notice Modifier to allow only the owner or a verified operator to call the function
    modifier onlyOwnerOrOperator() {
        require(
            _shareOperatorRegistry.isOperator(msg.sender) ||
                msg.sender == owner(),
            "SHARE030"
        );
        _;
    }

    constructor() public LimitedOwnable(true /* WALLET */, false /* SPLIT */) {}

    /// @notice Initializes this contract.
    /// @dev Recipient tokenId table is constructed off-chain and is
    /// constructed as follows:
    /// 1. A number of slots are allocated in an array corresponding
    /// to 1 / minimum percentage of any stakeholder in this asset.
    /// 2. IDs are assigned to slots such that the probability
    /// of an iterator pointing to a given ID is equal to that
    /// ID's ownership stake in the asset.
    /// 3. Additionally, the layout specified in (2) is randomized
    /// such that primary stakeholders have no advantage in payment
    /// time given that the iterator increments linearly through the
    /// ID table.
    /// 4. A parallel addresses array is filled with the corresponding
    /// owner for each tokenId. This is prefilled with the owner's
    /// address for each token, but designed with flexibilty to include
    /// others during initialization if they are known.
    /// The communitySplitsPercentage is a const denoted in
    /// basis points for how much of the slots the creator initially wants
    /// to allocate for everyone else.
    function initialize(
        address[] memory addresses_,
        uint256[] memory tokenIds_,
        address shareContractAddress_,
        uint256 communitySplitsPercentage_,
        address operatorRegistryAddress_
    ) public onlyOwner {
        require(tokenIds_.length == addresses_.length, "SHARE028");
        require(tokenIds_.length <= MAX_SPLIT_COUNT, "SHARE006");
        require(tokenIds_.length >= 1, "SHARE020");
        require(communitySplitsPercentage_ <= 10000, "SHARE029");

        setShareContractAddress(shareContractAddress_);
        _protocol = SHARE(shareContractAddress_);
        Immutable.setAddress(
            _operatorRegistryAddress,
            operatorRegistryAddress_
        );
        _shareOperatorRegistry = ShareOperatorRegistry(
            operatorRegistryAddress_
        );
        Immutable.setUnsignedInt256(_totalSlots, tokenIds_.length);
        Immutable.setUnsignedInt256(
            _communitySplitsPercentage,
            communitySplitsPercentage_
        );

        _totalCommunitySlots =
            (_totalSlots.value * _communitySplitsPercentage.value) /
            10000;

        // The owner addresses are SHARE approved wallets,
        // e.g. EOAs or wallets with approved code hashes.
        for (uint256 i = 0; i < addresses_.length; i++) {
            // All addresses in the table are SHARE approved wallets,
            // e.g. EOAs or wallets with approved code hashes.
            require(
                _protocol.isApprovedBuild(
                    addresses_[i],
                    CodeVerification.BuildType.WALLET
                ),
                "SHARE007"
            );
            Immutable.pushAddress(_addresses, addresses_[i]);
        }
        _addresses.locked = true;

        for (uint256 i = 0; i < tokenIds_.length; i++) {
            Immutable.pushUnsigned256Int(_tokenIds, tokenIds_[i]);
        }
        _tokenIds.locked = true;

        // Mint all of the slots to the corresponding address (default owner).
        for (uint256 i = 0; i < _tokenIds.value.length; i++) {
            // Duplicate verification ensures tokenIds are minted once.
            if (_tokenOwners[_tokenIds.value[i]] == address(0)) {
                emit MintingToken(_tokenIds.value[i], _addresses.value[i]);
                _safeMint(_addresses.value[i], _tokenIds.value[i]);
                _tokenOwners[_tokenIds.value[i]] = _addresses.value[i];
            }
        }
        setInitialized();
    }

    /// @notice This function provides access to the initial distribution table of
    /// addresses.
    function initialSplitDistributionTable()
        public
        view
        returns (address[] memory)
    {
        return _addresses.value;
    }

    /// @notice Returns the index of the tokenId in the table which
    /// is the next tokenId to receive payment on the reception of
    /// royalty by this contract.
    function tokenIdIndex() public view afterInit returns (uint256) {
        return _currentTokenIdIndex;
    }

    /// @notice Returns the community splits initialization percentage
    /// in basis points.
    function communitySplitsPercentage() public view returns (uint256) {
        return _communitySplitsPercentage.value;
    }

    /// @notice Returns the total ownership slots created for this contract
    function totalSlots() public view returns (uint256) {
        return _totalSlots.value;
    }

    /// @notice Receives royalty funds and distributes them among
    /// stakeholders specified in this contract using the SL2RD
    /// method described above.
    receive() external payable nonReentrant afterInit {
        address recipient = ownerOf(_tokenIds.value[_currentTokenIdIndex]);

        _currentTokenIdIndex =
            (_currentTokenIdIndex + 1) %
            (_tokenIds.value.length);
        payable(recipient).transfer(msg.value);

        emit Payment(
            msg.sender,
            recipient,
            _tokenIds.value[_currentTokenIdIndex],
            msg.value
        );
    }

    /// @notice Overrides ERC-721 safeTransferFrom function and ensures
    /// only SHARE approved wallets can recieve the SL2RD slot NFT.
    function safeTransferFrom(
        address from_,
        address to_,
        uint256 tokenId_
    ) public override {
        // Check if 'to' address is a SHARE approved wallet.
        require(
            _protocol.isApprovedBuild(to_, CodeVerification.BuildType.WALLET),
            "SHARE007"
        );

        // Call the parent's _transfer function
        super.safeTransferFrom(from_, to_, tokenId_);

        // Update the transfer timestamp
        _transferTimestamps[tokenId_] = block.timestamp;
    }

    /// @notice Overrides ERC-721 transferFrom function and ensures
    /// only SHARE approved wallets can recieve the SL2RD slot NFT.
    function transferFrom(
        address from_,
        address to_,
        uint256 tokenId_
    ) public override {
        // Check if 'to' address is a SHARE approved wallet.
        require(
            _protocol.isApprovedBuild(to_, CodeVerification.BuildType.WALLET),
            "SHARE007"
        );

        // Call the parent's _transfer function
        super.transferFrom(from_, to_, tokenId_);

        // Update the transfer timestamp
        _transferTimestamps[tokenId_] = block.timestamp;
    }

    /// @notice Returns the latest transfer timestamp for each tokenId.
    function slotTransferTimestamps()
        public
        view
        returns (uint256[MAX_SPLIT_COUNT] memory)
    {
        uint256[MAX_SPLIT_COUNT] memory timeStampValues;

        for (uint256 i = 0; i < _totalSlots.value; i++) {
            timeStampValues[i] = _transferTimestamps[i];
        }

        return (timeStampValues);
    }

    /// @notice Returns the latest transfer timestamp for the given tokenId.
    function slotTransferTimestamps(
        uint256 tokenId
    ) public view returns (uint256) {
        return (_transferTimestamps[tokenId]);
    }

    /// @notice Function to transfer the next available slot to a specified address.
    /// Monitors the availability of community slot allocation while delegating the next slot.
    /// It reverts if all community apportioned slots are allocated.
    function transferNextAvailable(
        address to
    ) public onlyOwnerOrOperator nonReentrant {
        require(
            _nextAvailableCommunitySlot <= _totalCommunitySlots - 1,
            "SHARE031"
        );

        transferFrom(owner(), to, _nextAvailableCommunitySlot);

        _nextAvailableCommunitySlot++;
    }

    /// @notice Reclaims a contract owned by this SL2RD, e.g. if a PFA
    /// is owned by this split, the split owner may transfer
    /// ownership of the PFA back to their account. This is intended
    /// for maintenance purposes, e.g. the ability for SL2RD owners to
    /// update tokenURIs and prices of PFAs, after which they may
    /// transfer (restore) ownership of the PFA back to the SL2RD.
    ///
    /// 1: init  | 2:reclaim | 3: maintain | 4: restore
    /// -----------------------------------------------
    /// [Owner]     [Owner]     [Owner]     [Owner]
    ///   |            |           |           |
    ///   |            |           |           |
    ///   |            |           |           |
    /// [SL2RD]       [PFA]       calls     [SL2RD]
    ///   |                  setTokenURI()     |
    ///   |                                    |
    ///   |                                    |
    /// [PFA]                                [PFA]
    function reclaim(
        address contractAddress_
    ) public afterInit onlyOwner nonReentrant {
        Ownable asset = Ownable(contractAddress_);
        require(asset.owner() == address(this), "SHARE025");
        asset.transferOwnership(msg.sender);
    }
}
