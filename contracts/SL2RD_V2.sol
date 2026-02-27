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

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./LimitedOwnable.sol";
import "./OperatorRegistry.sol";
import "./libraries/CodeVerification.sol";
import "./ERC20Payable.sol";

/// @title Swift Liquid Rotating Royalty Distributor V2 (SL2RD_V2).
/// @author brandon@formless.xyz
/// @notice This contract implements a variant of the rotational payment
/// distribution algorithm specified in SL2RD. In this variant,
/// "slots" are denoted as "shares", each of which are represented by
/// fungible ERC20 tokens. This enables the contract owner to list
/// the contract on a decentralized exchange such as Uniswap, forming
/// a token economy around individual properties. The linked list
/// implementation results in the ability to add and remove shareholders
/// in constant computational cost, while maintaining constant cost
/// payment distribution.
contract SL2RD_V2 is LimitedOwnable, ERC20, ERC2981, ERC20Payable {
    /// @notice Emitted when a payment is sent to a shareholder
    /// listed within this payment distribution contract.
    event Payment(
        address indexed from,
        address indexed recipient,
        uint256 indexed batchSize,
        uint256 value
    );

    OperatorRegistry private _shareOperatorRegistry;
    SHARE private _protocol;
    string public constant TOKEN_NAME = "SHARE";
    string public constant TOKEN_SYMBOL = "SHARE";
    uint8 private _decimals = 0;
    string private _name;
    string private _symbol;
    string private _contractURI;
    uint256 private _totalShares = 0;
    uint256 private _totalPublicShares = 0;
    uint256 private _publicSharesDistributed = 0;
    uint256 private _selectedShareholderPaymentCount = 0;
    uint256 private _shareholdersCount = 1;
    uint256 private _paymentBatchSize = 1;
    bool public _testMode = false;
    bool public _codeVerificationEnabled = false;
    mapping(bytes32 => bool) internal _approvedLiquidityPoolHashes;

    struct ShareholderNode {
        address shareholderAddress;
        address next;
        address prev;
    }

    struct ShareholderBalance {
        address shareholderAddress;
        uint256 balance;
    }

    mapping(address => ShareholderNode) public _shareholderNodes;
    address private _shareholdersRootNodeId;
    address private _shareholdersTailNodeId;
    address private _shareholdersSelectedNodeId;

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

    constructor()
        ERC20(TOKEN_NAME, TOKEN_SYMBOL)
        LimitedOwnable(true /* WALLET */, false /* SPLIT */)
    {}

    /// @notice Initializes this contract.
    /// @param name_ The name of the token.
    /// @param symbol_ The symbol of the token.
    /// @param totalShares_ The total number of shares to be minted.
    /// @param totalPublicShares_ The total number of public shares to be
    /// distributed.
    /// @param paymentBatchSize_ Set to greater than one to enable multiple
    /// payments per pointer iteration, which is useful for reducing the
    /// time between payouts while keeping gas cost low for the overall
    /// payments stream.
    /// @param primaryShareholderAddress_ The address of the primary shareholder.
    /// @param shareContractAddress_ The address of the SHARE protocol contract.
    /// @param operatorRegistryAddress_ The address of the SHARE operator registry.
    /// @param testMode_ Set to true to enable test mode, which allows for
    /// the contract owner to transfer shares to any address.
    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 totalShares_,
        uint256 totalPublicShares_,
        uint256 paymentBatchSize_,
        address primaryShareholderAddress_,
        address shareContractAddress_,
        address operatorRegistryAddress_,
        bool testMode_,
        bool codeVerificationEnabled_
    ) public onlyOwner {
        require(!super.initialized(), "SHARE040");
        _name = name_;
        _symbol = symbol_;
        _totalShares = totalShares_;
        _totalPublicShares = totalPublicShares_;
        _paymentBatchSize = paymentBatchSize_;
        setShareContractAddress(shareContractAddress_);
        _protocol = SHARE(shareContractAddress_);
        _shareOperatorRegistry = OperatorRegistry(operatorRegistryAddress_);
        _testMode = testMode_;
        _codeVerificationEnabled = codeVerificationEnabled_;
        _mint(primaryShareholderAddress_, totalShares_);
        ShareholderNode memory root = ShareholderNode(
            primaryShareholderAddress_,
            address(0),
            address(0)
        );
        _shareholdersRootNodeId = primaryShareholderAddress_;
        _shareholdersTailNodeId = primaryShareholderAddress_;
        _shareholdersSelectedNodeId = primaryShareholderAddress_;
        _shareholderNodes[primaryShareholderAddress_] = root;

        // Set default royalty to 10% (1000 basis points out of 10000)
        _setDefaultRoyalty(primaryShareholderAddress_, 1000);

        setInitialized();
    }

    /// @notice Returns payment batch size.
    function paymentBatchSize() public view returns (uint256) {
        return _paymentBatchSize;
    }

    /// @notice Returns the root node of the linked list of shareholders.
    function shareholdersRootNodeId() public view returns (address) {
        return _shareholdersRootNodeId;
    }

    /// @notice Returns a shareholder node object given a shareholder address.
    function getShareholder(
        address shareholderNodeId_
    ) public view returns (ShareholderNode memory) {
        return _shareholderNodes[shareholderNodeId_];
    }

    /// @notice Returns the token name.
    function name() public view override returns (string memory) {
        return _name;
    }

    /// @notice Returns the token symbol.
    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    /// @notice Allows the contract owner to set the token decimal number.
    /// @param decimals_ The number of decimals for the token.
    function setDecimals(uint8 decimals_) public nonReentrant onlyOwner {
        _decimals = decimals_;
    }

    /// @notice Returns the decimals number for the token display.
    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /// @notice Returns the total number of shares minted.
    function totalShares() public view returns (uint256) {
        return _totalShares;
    }

    /// @notice Returns the total number of public shares to be distributed.
    function totalPublicShares() public view returns (uint256) {
        return _totalPublicShares;
    }

    /// @notice Returns the total number of public shares distributed.
    function countPublicSharesDistributed() public view returns (uint256) {
        return _publicSharesDistributed;
    }

    /// @notice Returns a list of shareholder address to balance mappings.
    /// @param start_ The index of the first shareholder to return.
    /// @param count_ The number of shareholders to return.
    function shareholderBalances(
        uint256 start_,
        uint256 count_
    ) public view returns (ShareholderBalance[] memory) {
        ShareholderNode memory node = _shareholderNodes[
            _shareholdersRootNodeId
        ];
        for (uint256 i = 0; i < start_; i++) {
            node = _shareholderNodes[node.next];
        }
        ShareholderBalance[] memory balances = new ShareholderBalance[](count_);
        for (uint256 i = 0; i < count_; i++) {
            balances[i] = ShareholderBalance(
                node.shareholderAddress,
                balanceOf(node.shareholderAddress)
            );
            node = _shareholderNodes[node.next];
        }
        return balances;
    }

    /// @notice Returns the number of shareholders.
    function countShareholders() public view returns (uint256) {
        return _shareholdersCount;
    }

    /// @notice Adds a shareholder node to the internal linked list.
    function addShareholderNode(address shareholderAddress_) private {
        ShareholderNode memory node = ShareholderNode(
            shareholderAddress_ /* address */,
            address(0) /* next */,
            _shareholdersTailNodeId /* prev */
        );
        _shareholderNodes[_shareholdersTailNodeId].next = shareholderAddress_;
        _shareholdersTailNodeId = shareholderAddress_;
        _shareholderNodes[shareholderAddress_] = node;
        _shareholdersCount += 1;
    }

    /// @notice Deletes a shareholder node from the internal linked list.
    function deleteShareholderNode(address shareholderAddress_) private {
        ShareholderNode memory node = _shareholderNodes[shareholderAddress_];
        if (_shareholderNodes[node.prev].shareholderAddress != address(0)) {
            _shareholderNodes[node.prev].next = node.next;
        } else {
            _shareholdersRootNodeId = node.next;
        }
        if (node.next != address(0)) {
            _shareholderNodes[node.next].prev = node.prev;
        } else {
            _shareholderNodes[node.prev].next = address(0);
            _shareholdersTailNodeId = node.prev;
        }
        _shareholdersCount -= 1;
    }

    /// @notice Allows for ERC20 tokens to be transferred to a new address.
    /// @dev Overrides the ERC20 version to add additional check that ensures
    /// the recipient address is a SHARE approved wallet hash as well as
    /// internal linked list updates. This function is designed to be
    /// called from exchange platforms such as Uniswap and therefore there is
    /// no onlyOwnerOrOperator modifier. SHARE protocol registered operators
    /// should not call this function.
    function transfer(
        address to_,
        uint256 value_
    ) public override returns (bool) {
        if (_codeVerificationEnabled) {
            require(
                _protocol.isApprovedBuild(
                    to_,
                    CodeVerification.BuildType.WALLET
                ) ||
                    isApprovedLiquidityPoolCodeHash(
                        CodeVerification.readCodeHash(to_)
                    ),
                "SHARE007"
            );
        }
        if (balanceOf(to_) == 0) {
            addShareholderNode(to_);
        }
        super.transfer(to_, value_);
        if (balanceOf(msg.sender) == 0) {
            deleteShareholderNode(msg.sender);
        }
        return true;
    }

    /// @notice Allows for ERC20 tokens to be transferred to a new address.
    /// @dev Overrides the ERC20 version to add additional check that ensures
    /// the recipient address is a SHARE approved wallet hash as well as
    /// internal linked list updates. This function is designed to be
    /// called from token holders as well as SHARE protocol registered
    /// operators. If the caller is a SHARE protocol registered operator,
    /// the `from` value must be the contract owner. In other words,
    /// only the contract owner is delegating any priviledges to the
    /// SHARE protocol registered operator. Shareholders that are not
    /// the contract owner must call this function directly or approve
    /// delegation to an exchange contract.
    function transferFrom(
        address from_,
        address to_,
        uint256 value_
    ) public override returns (bool) {
        if (_codeVerificationEnabled) {
            require(
                _protocol.isApprovedBuild(
                    to_,
                    CodeVerification.BuildType.WALLET
                ) ||
                    isApprovedLiquidityPoolCodeHash(
                        CodeVerification.readCodeHash(to_)
                    ),
                "SHARE007"
            );
        }

        if (
            _shareOperatorRegistry.isOperator(msg.sender) ||
            msg.sender == owner()
        ) {
            require(_testMode || from_ == owner(), "SHARE041");
            super._approve(from_ /* owner */, msg.sender /* spender */, value_);
        }

        if (balanceOf(to_) == 0) {
            addShareholderNode(to_);
        }
        super.transferFrom(from_, to_, value_);
        if (balanceOf(from_) == 0) {
            deleteShareholderNode(from_);
        }
        return true;
    }

    /// @notice Transfers shares from public allocation (e.g. owned by the contract owner)
    /// to a new shareholder.
    /// @param to_ The address of the shareholder to transfer shares to.
    /// @param value_ The number of shares to transfer.
    function transferPublicShares(
        address to_,
        uint256 value_
    ) public onlyOwnerOrOperator nonReentrant {
        require(
            _publicSharesDistributed + value_ <= _totalPublicShares,
            "SHARE031"
        );
        transferFrom(owner(), to_, value_);
        _publicSharesDistributed += value_;
    }

    /// @notice Pays out to shareholders in a round-robin fashion, where each
    /// shareholder receives a number of payments in proportion to their balance
    /// over a sequence of payments. The number of payments per iteration is
    /// determined by the payment batch size parameter.
    receive() external payable nonReentrant afterInit {
        uint256 paymentValue;
        if (this.isERC20Payable()) {
            paymentValue =
                _erc20Token.balanceOf(address(this)) /
                _paymentBatchSize;
        } else {
            paymentValue = msg.value / _paymentBatchSize;
        }
        for (uint256 i = 0; i < _paymentBatchSize; i++) {
            ShareholderNode memory selectedShareholderNode = _shareholderNodes[
                _shareholdersSelectedNodeId
            ];
            if (
                _selectedShareholderPaymentCount ==
                balanceOf(selectedShareholderNode.shareholderAddress)
            ) {
                if (selectedShareholderNode.next != address(0)) {
                    _shareholdersSelectedNodeId = selectedShareholderNode.next;
                    selectedShareholderNode = _shareholderNodes[
                        _shareholdersSelectedNodeId
                    ];
                    _selectedShareholderPaymentCount = 0;
                } else {
                    _shareholdersSelectedNodeId = _shareholdersRootNodeId;
                    selectedShareholderNode = _shareholderNodes[
                        _shareholdersSelectedNodeId
                    ];
                    _selectedShareholderPaymentCount = 0;
                }
            }
            _selectedShareholderPaymentCount += 1;
            if (this.isERC20Payable()) {
                // SL2RD_V2 transfers are guaranteed to be
                // approved wallets and not a contract, therefore
                // there is no need to execute a `call`.
                // Also, the entire amount held in the SL2RD_V2 contract
                // is distributed, e.g. the contract never holds a
                // balance and immediately moves the money to a payee
                // from the ERC20 token.
                require(
                    _erc20Token.transfer(
                        selectedShareholderNode.shareholderAddress,
                        paymentValue
                    ),
                    "SHARE051"
                );
            } else {
                payable(selectedShareholderNode.shareholderAddress).transfer(
                    paymentValue
                );
            }
            emit Payment(
                msg.sender,
                selectedShareholderNode.shareholderAddress,
                _paymentBatchSize,
                paymentValue
            );
        }
    }

    /// @notice Enables code verification for destination shareholder addresses,
    /// such as Uniswap liquidity pool contracts.
    /// @param enable_ Set to true to enable code verification.
    function setCodeVerificationEnabled(
        bool enable_
    ) public nonReentrant onlyOwner {
        _codeVerificationEnabled = enable_;
    }

    /// @notice Adds an approved contract hash to the list of approved
    /// hashes.
    /// @param codeHash_ The keccak256 hash of the runtime bytecode of the
    function approveLiquidityPoolCodeHash(
        bytes32 codeHash_
    ) public onlyOwner nonReentrant {
        _approvedLiquidityPoolHashes[codeHash_] = true;
    }

    /// @notice Returns true if the supplied hash is included
    /// in the set of approved hashes.
    /// @param hash_ The keccak256 hash of the runtime bytecode of a
    /// candidate contract.
    function isApprovedLiquidityPoolCodeHash(
        bytes32 hash_
    ) public view returns (bool) {
        if (!_codeVerificationEnabled) {
            return true;
        } else {
            return _approvedLiquidityPoolHashes[hash_];
        }
    }

    /// @notice Returns the total ownership slots created for this contract.
    /// @dev For backward compatibility with SL2RD_V1.
    function totalSlots() public view returns (uint256) {
        return _totalShares;
    }

    /// @notice Returns the initial allocation of community slots.
    /// @dev For backward compatibility with SL2RD_V1.
    function totalCommunitySlots() public view returns (uint256) {
        return _totalPublicShares;
    }

    /// @notice Returns the number of community slots allocated.
    /// @dev For backward compatibility with SL2RD_V1.
    function countAllocatedCommunitySlots() public view returns (uint256) {
        return _publicSharesDistributed;
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

    /// @notice Returns whether the contract implements a given interface
    /// @dev Overrides ERC721's supportsInterface to include IERC20Payable and ERC2981 interfaces
    /// @param interfaceId The interface identifier, as specified in ERC-165
    /// @return bool True if the contract implements the interface, false otherwise.
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC2981) returns (bool) {
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IERC20Payable).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /// @notice Sets the ERC20 contract address (e.g., for USDC payments).
    function setERC20ContractAddress(
        address contractAddress_
    ) external onlyOwner {
        _setERC20ContractAddress(contractAddress_);
    }

    /// @notice Sets the token name.
    /// @param name_ The new name for the token.
    function setName(string memory name_) external onlyOwner {
        _name = name_;
    }

    /// @notice Sets the token symbol.
    /// @param symbol_ The new symbol for the token.
    function setSymbol(string memory symbol_) external onlyOwner {
        _symbol = symbol_;
    }

    /// @notice Sets the contract-level metadata URI.
    /// @param contractURI_ The URI pointing to contract-level metadata.
    function setContractURI(string memory contractURI_) external onlyOwner {
        _contractURI = contractURI_;
    }

    /// @notice Returns the contract-level metadata URI.
    /// @return The contract metadata URI.
    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    /// @notice Sets the default royalty for all tokens.
    /// @param receiver_ The address that will receive royalty payments.
    /// @param feeNumerator_ The royalty fee in basis points (e.g., 1000 = 10%).
    function setDefaultRoyalty(
        address receiver_,
        uint96 feeNumerator_
    ) external onlyOwner {
        _setDefaultRoyalty(receiver_, feeNumerator_);
    }

    /// @notice Removes the default royalty.
    function deleteDefaultRoyalty() external onlyOwner {
        _deleteDefaultRoyalty();
    }
}
