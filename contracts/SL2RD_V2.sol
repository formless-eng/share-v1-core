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
import "./LimitedOwnable.sol";
import "./OperatorRegistry.sol";

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
contract SL2RD_V2 is LimitedOwnable, ERC20 {
    /// @notice Emitted when a payment is sent to a shareholder
    /// listed within this payment distribution contract.
    event Payment(address indexed from, address indexed to, uint256 value);
    event AddShareholderNode();

    OperatorRegistry private _shareOperatorRegistry;
    SHARE private _protocol;
    string public constant TOKEN_NAME = "SHARE";
    string public constant TOKEN_SYMBOL = "SHARE";
    string private _name;
    string private _symbol;
    uint256 private _totalShares = 0;
    uint256 private _totalPublicShares = 0;
    uint256 private _publicSharesDistributed = 0;
    uint256 private _selectedShareholderPaymentCount = 0;
    uint256 private _paymentBatchSize = 1;
    uint256 private _shareholdersCount = 1;
    bool public _testMode = false;

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

    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 totalShares_,
        uint256 totalPublicShares_,
        uint256 paymentBatchSize_,
        address shareContractAddress_,
        address operatorRegistryAddress_,
        bool testMode_
    ) public onlyOwner {
        require(!super.initialized(), "SHARE040");
        _name = name_;
        _symbol = symbol_;
        _totalPublicShares = totalPublicShares_;
        _paymentBatchSize = paymentBatchSize_;
        setShareContractAddress(shareContractAddress_);
        _protocol = SHARE(shareContractAddress_);
        _shareOperatorRegistry = OperatorRegistry(operatorRegistryAddress_);
        _testMode = testMode_;
        _mint(msg.sender, totalShares_);
        ShareholderNode memory root = ShareholderNode(
            msg.sender,
            address(0),
            address(0)
        );
        _shareholdersRootNodeId = msg.sender;
        _shareholdersTailNodeId = msg.sender;
        _shareholdersSelectedNodeId = msg.sender;
        _shareholderNodes[msg.sender] = root;
        setInitialized();
    }

    function setPaymentBatchSize(
        uint256 paymentBatchSize_
    ) public nonReentrant onlyOwner {
        _paymentBatchSize = paymentBatchSize_;
    }

    function paymentBatchSize() public view returns (uint256) {
        return _paymentBatchSize;
    }

    function shareholdersRootNodeId() public view returns (address) {
        return _shareholdersRootNodeId;
    }

    function getShareholder(
        address shareholderNodeId_
    ) public view returns (ShareholderNode memory) {
        return _shareholderNodes[shareholderNodeId_];
    }

    function name() public view override returns (string memory) {
        return _name;
    }

    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    function totalShares() public view returns (uint256) {
        return _totalShares;
    }

    function totalPublicShares() public view returns (uint256) {
        return _totalPublicShares;
    }

    function countPublicSharesDistributed() public view returns (uint256) {
        return _publicSharesDistributed;
    }

    function shareholderBalances(
        uint256 start,
        uint256 count
    ) public view returns (ShareholderBalance[] memory) {
        ShareholderNode memory node = _shareholderNodes[
            _shareholdersRootNodeId
        ];
        for (uint256 i = 0; i < start; i++) {
            node = _shareholderNodes[node.next];
        }
        ShareholderBalance[] memory balances = new ShareholderBalance[](count);
        for (uint256 i = 0; i < count; i++) {
            balances[i] = ShareholderBalance(
                node.shareholderAddress,
                balanceOf(node.shareholderAddress)
            );
            node = _shareholderNodes[node.next];
        }
        return balances;
    }

    function countShareholders() public view returns (uint256) {
        return _shareholdersCount;
    }

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
        address to,
        uint256 value
    ) public override returns (bool) {
        address owner = _msgSender();
        transferFrom(owner, to, value);
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
        address from,
        address to,
        uint256 value
    ) public override returns (bool) {
        // Check if 'to' address is a SHARE approved wallet.
        require(
            _protocol.isApprovedBuild(to, CodeVerification.BuildType.WALLET),
            "SHARE007"
        );

        if (
            _shareOperatorRegistry.isOperator(msg.sender) ||
            msg.sender == owner()
        ) {
            require(_testMode || from == owner(), "SHARE041");
            super._approve(from /* owner */, msg.sender /* spender */, value);
        }

        if (balanceOf(to) == 0) {
            addShareholderNode(to);
        }

        super.transferFrom(from, to, value);

        if (balanceOf(from) == 0) {
            deleteShareholderNode(from);
        }
        return true;
    }

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

    receive() external payable nonReentrant afterInit {
        uint256 paymentValue = msg.value / _paymentBatchSize;
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
            payable(selectedShareholderNode.shareholderAddress).transfer(
                paymentValue
            );
            emit Payment(
                msg.sender,
                selectedShareholderNode.shareholderAddress,
                msg.value
            );
            _selectedShareholderPaymentCount += 1;
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

    // ----- BEGIN: Split backward compatibility interface for SHARE UI V2 -----
    function totalSlots() public view returns (uint256) {
        return _totalShares;
    }

    function totalCommunitySlots() public view returns (uint256) {
        return _totalPublicShares;
    }

    function countAllocatedCommunitySlots() public view returns (uint256) {
        return _publicSharesDistributed;
    }
    // ----- END: Split backward compatibility interface for SHARE UI V2 -----
}
