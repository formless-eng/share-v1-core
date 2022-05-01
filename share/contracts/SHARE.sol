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

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./libraries/CodeVerification.sol";
import "./interfaces/IPFA.sol";

/// @title SHARE protocol contract.
/// @author brandon@formless.xyz
/// @notice A protocol which works in conjunction with SHARE
/// decentralized distribution network (DDN) microservice endpoints
/// to perform content distribtion on blockchain with creator
/// controlled pay-for-access (PFA) micro-transactions.
contract SHARE is Ownable, ReentrancyGuard {
    /// @notice Emitted when a successful access grant is awarded
    /// to a recipient address for a given PFA contract.
    event Grant(
        address indexed recipient,
        address indexed contractAddress,
        uint256 indexed tokenId
    );

    /// @notice Emitted when a successful license grant is awarded
    /// to a recipient (licensee) address for a given PFA (licensor) contract.
    event License(address indexed licensor, address indexed licensee);

    string public constant VERSION = "1.0.0";
    bytes32
        private constant EOA_KECCAK256 = 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;
    uint256 public _transactionFeeNumerator = 1;
    uint256 public _transactionFeeDenominator = 20;
    bool public _codeVerificationEnabled = true;
    uint256 private constant UNIT_TOKEN_INDEX = 0;

    mapping(bytes32 => ApprovedBuild) internal _approvedHashes;
    mapping(address => mapping(address => uint256)) internal _grantTimestamps;
    mapping(address => mapping(address => uint256)) internal _licenseTimestamps;

    struct ApprovedBuild {
        CodeVerification.BuildType buildType;
        string compilerBinaryTarget;
        string compilerVersion;
        address authorAddress;
        bool exists;
    }

    constructor() public {
        addApprovedBuild(
            EOA_KECCAK256,
            CodeVerification.BuildType.WALLET,
            "",
            "",
            msg.sender
        );
    }

    /// @notice Used to set the transaction fee for the protocol.
    /// Calculated using provided _numerator / _denominator. Note that
    /// SHARE PFA contracts can (optionally) be accessed _without_
    /// using the SHARE protocol contract if the URI microservice
    /// endpoint is self-hosted, however the use of SHARE provided
    /// DDN endpoints requires an associated payment to the protocol.
    function setTransactionFee(uint256 numerator_, uint256 denominator_)
        public
        nonReentrant
        onlyOwner
    {
        _transactionFeeNumerator = numerator_;
        _transactionFeeDenominator = denominator_;
    }

    /// @notice Returns the consumer facing gross price to access the
    /// the asset. This price is calculated using `creator price` +
    ///`creator price` * `transaction fee`.
    function grossPricePerAccess(address contractAddress_, uint256 tokenId_)
        public
        view
        returns (uint256)
    {
        require(tokenId_ == UNIT_TOKEN_INDEX, "SHARE004");
        IPFA asset = IPFA(contractAddress_);
        uint256 pricePerAccess = asset.pricePerAccess();
        uint256 protocolFee = SafeMath.div(
            SafeMath.mul(pricePerAccess, _transactionFeeNumerator),
            _transactionFeeDenominator
        );
        return SafeMath.add(pricePerAccess, protocolFee);
    }

    /// @notice Instantiates the creator contract and calls the
    /// access method. If successful, this transaction produces a
    /// grant awarded to the sender with a corresponding TTL.
    function access(address contractAddress_, uint256 tokenId_)
        public
        payable
        nonReentrant
    {
        IPFA asset = IPFA(contractAddress_);
        uint256 grossPrice = grossPricePerAccess(contractAddress_, tokenId_);
        require(msg.value == grossPrice, "SHARE011");
        asset.access{value: asset.pricePerAccess()}(tokenId_, msg.sender);
        _grantTimestamps[contractAddress_][msg.sender] = block.timestamp;
        emit Grant(msg.sender, contractAddress_, tokenId_);
    }

    /// @notice If called with a `licenseeContract_` contract which
    /// has proof of inclusion of the supplied `licensorContract_`
    /// PFA address in its payout distribution table, records a
    /// license timestamp on chain which is read by decentralized
    /// distribution network (DDN) microservices to decrypt and serve
    /// the associated content for the tokenURI to users who have
    /// paid to access the licensee contract.
    function license(address licensorContract_, address licenseeContract_)
        public
        payable
        nonReentrant
    {
        require(msg.sender == Ownable(licenseeContract_).owner(), "SHARE016");
        IPFA asset = IPFA(licensorContract_);
        asset.license(licenseeContract_);
        _licenseTimestamps[licensorContract_][licenseeContract_] = block
            .timestamp;
        emit License(licensorContract_, licenseeContract_);
    }

    /// @notice Returns the timestamp in seconds of the award of a
    /// grant recorded on chain for the access of the content
    /// associated with the supplied PFA and recipient address.
    function grantTimestamp(address contractAddress_, address recipient_)
        public
        view
        returns (uint256)
    {
        return _grantTimestamps[contractAddress_][recipient_];
    }

    /// @notice Returns the timestamp in seconds of the award of a
    /// grant recorded on chain for the licensing of the content
    /// associated with the supplied PFA and recipient address.
    function licenseTimestamp(
        address licensorAddress_,
        address licenseeAddress_
    ) public view returns (uint256) {
        return _licenseTimestamps[licensorAddress_][licenseeAddress_];
    }

    /// @notice Withdraws contract balance.
    function withdraw() public nonReentrant onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    /// @notice Enables or disables protocol source code verification
    /// for contracts interacting with the protocol.
    function setCodeVerificationEnabled(bool enable)
        public
        nonReentrant
        onlyOwner
    {
        _codeVerificationEnabled = enable;
    }

    /// @notice Adds the keccak256 hash of the runtime bytecode of
    /// an approved source code build for a SHARE protocol
    /// interoperable contract. If source code verification is turned
    /// on, the system will revert upon attempt to send ether to
    /// a contract built from non-approved source code.
    function addApprovedBuild(
        bytes32 codeHash,
        CodeVerification.BuildType buildType_,
        string memory compilerBinaryTarget_,
        string memory compilerVersion_,
        address authorAddress_
    ) public onlyOwner nonReentrant {
        require(
            (buildType_ == CodeVerification.BuildType.WALLET ||
                buildType_ == CodeVerification.BuildType.SPLIT ||
                buildType_ == CodeVerification.BuildType.PFA_UNIT ||
                buildType_ == CodeVerification.BuildType.PFA_COLLECTION),
            "SHARE017"
        );
        _approvedHashes[codeHash] = ApprovedBuild(
            buildType_,
            compilerBinaryTarget_,
            compilerVersion_,
            authorAddress_,
            true
        );
    }

    /// @notice Returns true if the keccak256 hash of the runtime
    /// bytecode stored at the given `address_` corresponds to a build
    /// of approved source code for SHARE protocol interoperability.
    function isApprovedBuild(
        address address_,
        CodeVerification.BuildType buildType_
    ) public view returns (bool) {
        if (!_codeVerificationEnabled) {
            return true;
        } else {
            bytes32 codeHash = CodeVerification.readCodeHash(address_);
            if (_approvedHashes[codeHash].exists) {
                return _approvedHashes[codeHash].buildType == buildType_;
            } else {
                return false;
            }
        }
    }

    /// @notice Returns true if the supplied keccak256
    /// hash corresponds to a build of approved source code for SHARE
    /// protocol interoperability.
    function isApprovedBuildHash(
        bytes32 hash,
        CodeVerification.BuildType buildType_
    ) public view returns (bool) {
        if (!_codeVerificationEnabled) {
            return true;
        } else {
            if (_approvedHashes[hash].exists) {
                return _approvedHashes[hash].buildType == buildType_;
            } else {
                return false;
            }
        }
    }
}
