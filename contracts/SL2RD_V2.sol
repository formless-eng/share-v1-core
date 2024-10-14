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
import "./libraries/Immutable.sol";

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
    bool public _testMode = false;

    struct ShareholderNode {
        address shareholderAddress;
        address next;
        address prev;
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
        require(!super.initialized(), "Already initialized");
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

    function addShareholderNode(address shareholderAddress_) private {
        ShareholderNode memory node = ShareholderNode(
            shareholderAddress_ /* address */,
            address(0) /* next */,
            _shareholdersTailNodeId /* prev */
        );
        _shareholderNodes[_shareholdersTailNodeId].next = shareholderAddress_;
        _shareholdersTailNodeId = shareholderAddress_;
        _shareholderNodes[shareholderAddress_] = node;
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
    }

    // NOTE: This is for Uniswap. It should not be called by operators in SHARE.
    function transfer(
        address to,
        uint256 value
    ) public override returns (bool) {
        address owner = _msgSender();
        transferFrom(owner, to, value);
        return true;
    }

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
            require(_testMode || from == owner(), "NOT AUTHORIZED");
            super._approve(from /* owner */, msg.sender /* spender */, value);
        }

        if (balanceOf(to) == 0) {
            // Add shareholder node to linked list
            addShareholderNode(to);
        }

        super.transferFrom(from, to, value);

        if (balanceOf(from) == 0) {
            deleteShareholderNode(from);
        }
        return true;
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
}
