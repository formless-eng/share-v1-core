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
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./libraries/Immutable.sol";
import "./LimitedOwnable.sol";
import "./OperatorRegistry.sol";
import "./interfaces/IERC20Payable.sol";

/// @title Swift Liquid Rotating Royalty Distributor (SL2RD).
/// @author john-paul@formless.xyz, brandon@formless.xyz
/// @notice This contract implements efficient liquid payment splitting
/// by shuffling recipient tokenIds off-chain into a random distribution
/// and dealing transactions to those recipient slot entries atomically, e.g.
/// payments are "dealt" in a rotating fashion rather than "split". This
/// results in immense gas savings and as the number of transactions
/// approaches infinity the delta between revenue received and revenue owed
/// by each recipient approaches zero.
contract SL2RD is
    LimitedOwnable,
    ERC721("Swift Liquid Rotating Royalty Distributor", "SL2RD"),
    IERC20Payable
{
    /// @notice Emitted when a payment is sent to a stakeholder
    /// slot listed within this payment distribution contract.
    event Payment(
        address indexed from,
        address indexed recipient,
        uint256 indexed tokenIndex,
        uint256 value
    );
    event MintingToken(uint256 indexed tokenId, address indexed toAddress);

    uint256 public constant MAX_SPLIT_COUNT = 10000;
    /// Max partition size empirically derived as a result of 30M gas
    /// block limit on L2 blockchains. For a 10000 slot distribution
    /// this would take 100 multipart transactions to initialize.
    uint256 public constant MAX_PARTITION_SIZE = 100;
    /// Max basis points of 10000 corresponds to 10000 splits each
    /// at 0.01% ownership.
    uint256 public constant MAX_BASIS_POINTS = 10000;
    Immutable.UnsignedInt256 private _totalSlots;
    Immutable.UnsignedInt256Array private _tokenIds;
    Immutable.AddressArray private _addresses;
    Immutable.UnsignedInt256 private _communitySplitsBasisPoints;
    Immutable.Address private _initialOwner;
    uint256 private _totalCommunitySlots = 0;
    uint256 private _nextAvailableCommunitySlot = 0;
    uint256 private _currentTokenIdIndex = 0;
    uint256[MAX_SPLIT_COUNT] private _transferTimestamps;
    mapping(uint256 => address) private _tokenOwners;

    OperatorRegistry private _shareOperatorRegistry;
    SHARE private _protocol;

    // ERC20 contract address (e.g., for USDC payments)
    address private _erc20ContractAddress;
    uint256 private _paymentBatchSize = 1;

    /// @notice Modifier to allow only the owner or a verified operator
    /// to call the function
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
    /// The communitySplitsBasisPoints is a constant percentage denoted in
    /// basis points for how many of the slots the creator initially wants
    /// to allocate for everyone else.
    /// @param addresses_ The addresses for initial distribution.
    /// @param tokenIds_ The tokenIds for initial distribution.
    /// @param communitySplitsBasisPoints_ The percentage of slots allocated
    /// for the community (denoted in basis points); e.g. 20% is denoted as 2000.
    /// @param shareContractAddress_ The address of the share contract.
    /// @param operatorRegistryAddress_ The address of the share operator registry.
    function initialize(
        address[] memory addresses_,
        uint256[] memory tokenIds_,
        uint256 communitySplitsBasisPoints_,
        address shareContractAddress_,
        address operatorRegistryAddress_
    ) public onlyOwner {
        require(tokenIds_.length == addresses_.length, "SHARE028");
        require(tokenIds_.length <= MAX_SPLIT_COUNT, "SHARE006");
        require(tokenIds_.length >= 1, "SHARE020");
        require(communitySplitsBasisPoints_ <= MAX_BASIS_POINTS, "SHARE029");

        setShareContractAddress(shareContractAddress_);
        _protocol = SHARE(shareContractAddress_);

        _shareOperatorRegistry = OperatorRegistry(operatorRegistryAddress_);
        Immutable.setUnsignedInt256(_totalSlots, tokenIds_.length);
        Immutable.setUnsignedInt256(
            _communitySplitsBasisPoints,
            communitySplitsBasisPoints_
        );
        Immutable.setAddress(_initialOwner, addresses_[0]);

        _totalCommunitySlots =
            (_totalSlots.value * _communitySplitsBasisPoints.value) /
            MAX_BASIS_POINTS;

        // The owner addresses are SHARE approved wallets,
        // e.g. EOAs or wallets with approved code hashes.
        for (uint256 i = 0; i < addresses_.length; i++) {
            // Check that all addresses in the table are SHARE approved wallets,
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
            Immutable.pushUnsignedInt256(_tokenIds, tokenIds_[i]);
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

    /// @notice Prepares the contract for multipart initialization.
    /// @dev Recipient tokenId table is constructed off-chain and is
    /// constructed as follows:
    /// 1. A number of slots are allocated in an array corresponding
    /// to 1 / minimum percentage of any stakeholder in this asset.
    /// 2. IDs are assigned to slots redundantly such that the probability
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
    /// The communitySplitsBasisPoints is a constant percentage denoted in
    /// basis points for how many of the slots the owner initially wants
    /// to allocate for everyone else.
    /// 5. The array noted in (1) is partitioned into multiple arrays
    /// such that a composite array is constructed through a series of
    /// calls to `multipartAddPartition`, followed by a final call to
    /// `multipartInitializationEnd`. This is a requirement for large
    /// distributions where the block gas limit would otherwise be
    /// exceeded when attempting to initialize the contract.
    /// @param communitySplitsBasisPoints_ The percentage of slots allocated
    /// for the community (denoted in basis points); e.g. 20% is denoted as 2000.
    /// @param shareContractAddress_ The address of the share contract.
    /// @param operatorRegistryAddress_ The address of the share operator registry.
    function multipartInitializationBegin(
        uint256 communitySplitsBasisPoints_,
        address shareContractAddress_,
        address operatorRegistryAddress_
    ) public onlyOwner {
        require(communitySplitsBasisPoints_ <= MAX_BASIS_POINTS, "SHARE029");
        setShareContractAddress(shareContractAddress_);
        _protocol = SHARE(shareContractAddress_);
        _shareOperatorRegistry = OperatorRegistry(operatorRegistryAddress_);
        Immutable.setUnsignedInt256(
            _communitySplitsBasisPoints,
            communitySplitsBasisPoints_
        );
    }

    /// @notice Initializes a specified partition of the distribution
    /// vector. Called for each sub-partition until the entire distribution
    /// vector is stored on-chain.
    /// @param addresses_ The addresses for initial distribution.
    /// @param tokenIds_ The tokenIds for initial distribution.
    function multipartAddPartition(
        uint256 partitionIndex_,
        address[] memory addresses_,
        uint256[] memory tokenIds_
    ) public onlyOwner {
        require(tokenIds_.length == addresses_.length, "SHARE028");
        require(tokenIds_.length <= MAX_PARTITION_SIZE, "SHARE038");
        require(tokenIds_.length >= 1, "SHARE020");
        if (partitionIndex_ == 0) {
            Immutable.setAddress(_initialOwner, addresses_[0]);
        }
        // The owner addresses are SHARE approved wallets,
        // e.g. EOAs or wallets with approved code hashes.
        for (uint256 i = 0; i < addresses_.length; i++) {
            // Check that all addresses in the table are SHARE approved wallets,
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

        for (uint256 i = 0; i < tokenIds_.length; i++) {
            Immutable.pushUnsignedInt256(_tokenIds, tokenIds_[i]);
        }

        // Mint all of the slots to the corresponding address (default owner).
        uint256 startIndex = partitionIndex_ * tokenIds_.length;
        for (uint256 i = startIndex; i < startIndex + tokenIds_.length; i++) {
            // Duplicate verification ensures tokenIds are minted once.
            if (_tokenOwners[_tokenIds.value[i]] == address(0)) {
                emit MintingToken(_tokenIds.value[i], _addresses.value[i]);
                _safeMint(_addresses.value[i], _tokenIds.value[i]);
                _tokenOwners[_tokenIds.value[i]] = _addresses.value[i];
            }
        }
    }

    /// @notice Completes multipart initilization and sets
    /// addresses_ and tokenIds_ write state to immutable.
    function multipartInitializationEnd() public {
        _addresses.locked = true;
        _tokenIds.locked = true;
        Immutable.setUnsignedInt256(_totalSlots, _tokenIds.value.length);
        _totalCommunitySlots =
            (_totalSlots.value * _communitySplitsBasisPoints.value) /
            MAX_BASIS_POINTS;
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

    /// @notice This function provides access to the live distribution table of
    /// addresses, derived from the current slot owners based on the most recent
    /// block data.
    function splitDistributionTable() public view returns (address[] memory) {
        address[] memory owners = new address[](_totalSlots.value);
        for (uint256 i = 0; i < _totalSlots.value; i++) {
            owners[i] = ownerOf(_tokenIds.value[i]);
        }
        return owners;
    }

    /// @notice Returns the index of the tokenId in the table which
    /// is the next tokenId to receive payment on the reception of
    /// payment by this contract.
    function tokenIdIndex() public view afterInit returns (uint256) {
        return _currentTokenIdIndex;
    }

    /// @notice Returns the community splits initialization basis points.
    function communitySplitsBasisPoints()
        public
        view
        afterInit
        returns (uint256)
    {
        return _communitySplitsBasisPoints.value;
    }

    /// @notice Returns the next available community slot id.
    function countAllocatedCommunitySlots() public view returns (uint256) {
        return _nextAvailableCommunitySlot;
    }

    /// @notice Returns the total ownership slots created for this contract.
    function totalSlots() public view afterInit returns (uint256) {
        return _totalSlots.value;
    }

    /// @notice Returns the initial allocation of community slots.
    function totalCommunitySlots() public view afterInit returns (uint256) {
        return _totalCommunitySlots;
    }

    /// @notice Receives payment funds and distributes them among
    /// stakeholders specified in this contract using the SL2RD
    /// method described above.
    receive() external payable nonReentrant afterInit {
        IERC20 token = IERC20(_erc20ContractAddress);
        uint256 paymentValue = 0;
        if (_erc20ContractAddress != address(0)) {
            paymentValue = token.balanceOf(address(this)) / _paymentBatchSize;
        } else {
            paymentValue = msg.value / _paymentBatchSize;
        }

        for (uint256 i = 0; i < _paymentBatchSize; i++) {
            address recipient = ownerOf(_tokenIds.value[_currentTokenIdIndex]);
            _currentTokenIdIndex =
                (_currentTokenIdIndex + 1) %
                (_tokenIds.value.length);

            if (_erc20ContractAddress == address(0)) {
                payable(recipient).transfer(paymentValue);
                emit Payment(
                    msg.sender,
                    recipient,
                    _tokenIds.value[_currentTokenIdIndex],
                    paymentValue
                );
            } else {
                // A transfer to a split has exactly 1 hop:
                // The transfer from the split to a recipient wallet.
                // Therefore we know the recipient is a SHARE
                // approved wallet and not a contract.

                // The entire amount held in the SL2RD contract
                // is distributed, e.g. the contract never holds a
                // balance and immediately moves the money to a payee
                // from the ERC20 token.
                require(token.transfer(recipient, paymentValue), "SHARE044");
                emit Payment(
                    msg.sender,
                    recipient,
                    _tokenIds.value[_currentTokenIdIndex],
                    paymentValue
                );
            }
        }
    }

    /// @notice Allows for an ERC-721 token to be transferred to a new address.
    /// @dev Overrides the ERC721 version to add additional check that ensures
    // the recipient address is a SHARE approved wallet hash.
    function safeTransferFrom(
        address from_,
        address to_,
        uint256 tokenId_
    ) public override {
        // Restrict trading of community slots until distribution process is complete.
        if (_nextAvailableCommunitySlot < _totalCommunitySlots) {
            require(tokenId_ >= _totalCommunitySlots, "SHARE037");
        }

        // Check if 'to' address is a SHARE approved wallet.
        require(
            _protocol.isApprovedBuild(to_, CodeVerification.BuildType.WALLET),
            "SHARE007"
        );

        // Call the parent's transferFrom function
        super.safeTransferFrom(from_, to_, tokenId_);

        // Update the transfer timestamp
        _transferTimestamps[tokenId_] = block.timestamp;
    }

    /// @notice Allows for an ERC-721 token to be transferred to a new address.
    /// @dev Overrides the ERC721 version to add additional check that ensures
    // the recipient address is a SHARE approved wallet hash.
    function transferFrom(
        address from_,
        address to_,
        uint256 tokenId_
    ) public override {
        // Restrict trading of community slots until distribution process is complete.
        if (_nextAvailableCommunitySlot < _totalCommunitySlots) {
            require(tokenId_ >= _totalCommunitySlots, "SHARE037");
        }

        // Check if 'to' address is a SHARE approved wallet.
        require(
            _protocol.isApprovedBuild(to_, CodeVerification.BuildType.WALLET),
            "SHARE007"
        );

        // Call the parent's transferFrom function
        super.transferFrom(from_, to_, tokenId_);

        // Update the transfer timestamp
        _transferTimestamps[tokenId_] = block.timestamp;
    }

    /// @notice Returns an array of the latest transfer timestamps for each tokenId.
    function slotTransferTimestamps()
        public
        view
        returns (uint256[MAX_SPLIT_COUNT] memory)
    {
        return (_transferTimestamps);
    }

    /// @notice Returns the timestamp of the most recent transfer of a specific tokenId.
    function slotTransferTimestamp(
        uint256 tokenId
    ) public view returns (uint256) {
        return (_transferTimestamps[tokenId]);
    }

    /// @notice Function to transfer the next available slot to a specified address. Self contained
    /// distribution logic that is only called during the distribution period and wholly handles the
    /// process, including transfers.
    /// Monitors the availability of community slot allocation while delegating the next slot.
    /// It reverts if all community apportioned slots are allocated.
    function transferNextAvailable(
        address to_
    ) public onlyOwnerOrOperator nonReentrant {
        // Gates process to only continue until community reservations are depleted.
        require(_nextAvailableCommunitySlot < _totalCommunitySlots, "SHARE031");

        // Ensure the initial owner still owns the community slot before transfer.
        require(
            ownerOf(_nextAvailableCommunitySlot) == _initialOwner.value,
            "SHARE035"
        );

        // Check if 'to_' address is a SHARE approved wallet.
        require(
            _protocol.isApprovedBuild(to_, CodeVerification.BuildType.WALLET),
            "SHARE007"
        );

        // Allows the operator to call transfer without revert
        if (
            _shareOperatorRegistry.isOperator(msg.sender) ||
            msg.sender == owner()
        ) {
            super._approve(msg.sender, _nextAvailableCommunitySlot);
        }

        super.transferFrom(owner(), to_, _nextAvailableCommunitySlot);

        // Update the transfer timestamp
        _transferTimestamps[_nextAvailableCommunitySlot] = block.timestamp;

        _nextAvailableCommunitySlot++;
    }

    /// @notice Function to transfer multiple available slots to a specifed address.
    function transferMultipleAvailable(
        address to_,
        uint256 slots_
    ) public onlyOwnerOrOperator {
        for (uint256 i = 0; i < slots_; i++) {
            transferNextAvailable(to_);
        }
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

    /// @notice Sets the ERC20 contract address (e.g., for USDC payments).
    function setERC20ContractAddress(
        address contractAddress_
    ) public override afterInit onlyOwner nonReentrant {
        require(contractAddress_ != address(0), "SHARE042");
        _erc20ContractAddress = contractAddress_;
    }

    /// @notice Gets the ERC20 contract address used for payments.
    function getERC20ContractAddress() external view returns (address) {
        return _erc20ContractAddress;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721) returns (bool) {
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC20Payable).interfaceId;
    }

    function setPaymentBatchSize(
        uint256 batchSize_
    ) public onlyOwnerOrOperator {
        require(batchSize_ > 0, "SHARE043");
        _paymentBatchSize = batchSize_;
    }
}
