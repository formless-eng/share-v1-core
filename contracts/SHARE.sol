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

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./libraries/CodeVerification.sol";
import "./interfaces/IPFA.sol";
import "./ERC20Payable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title SHARE protocol contract.
/// @author brandon@formless.xyz
/// @notice A protocol which works in conjunction with SHARE
/// decentralized distribution network (DDN) microservice endpoints
/// to perform distribtion services on blockchain with creator
/// controlled terms.
contract SHARE is ERC20Payable, Ownable, ReentrancyGuard {
    /// @notice Emitted when a successful access grant is awarded
    /// to a recipient address for a given PFA contract.
    event Grant(
        address indexed recipient,
        address indexed contractAddress,
        uint256 indexed tokenId
    );
    event Payment(
        address indexed from,
        address indexed recipient,
        uint256 value
    );

    /// @notice Emitted when a successful license grant is awarded
    /// to a recipient (licensee) address for a given PFA (licensor) contract.
    event License(address indexed licensor, address indexed licensee);

    string public constant VERSION = "1.0.0";
    bytes32 private constant EOA_KECCAK256 =
        0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;
    uint256 public _transactionFeeNumerator = 1;
    uint256 public _transactionFeeDenominator = 20;
    uint256 public _transactionCount = 0;
    uint256 public _transactionVolume = 0;
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

    struct ApprovedBuildHash {
        bytes32 codeHash;
        CodeVerification.BuildType buildType;
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
    function setTransactionFee(
        uint256 numerator_,
        uint256 denominator_
    ) public nonReentrant onlyOwner {
        _transactionFeeNumerator = numerator_;
        _transactionFeeDenominator = denominator_;
    }

    /// @notice Returns the consumer facing gross price to access the
    /// the asset. This price is calculated using `access price` +
    ///`access price` * `transaction fee`.
    function grossPricePerAccess(
        address contractAddress_,
        uint256 tokenId_
    ) public view returns (uint256) {
        require(tokenId_ == UNIT_TOKEN_INDEX, "SHARE004");
        IPFA asset = IPFA(contractAddress_);
        uint256 pricePerAccess = asset.pricePerAccess();
        // Note that this contract is implemented with Solidity
        // version >=0.8.0 which has built-in overflow checks,
        // therefore using SafeMath is not required.
        uint256 protocolFee = (pricePerAccess * _transactionFeeNumerator) /
            _transactionFeeDenominator;
        return pricePerAccess + protocolFee;
    }

    /// @notice Returns the licensee facing gross price to license the
    /// the asset. This price is calculated using `license price` +
    ///`license price` * `transaction fee`.
    function grossPricePerLicense(
        address contractAddress_
    ) public view returns (uint256) {
        IPFA asset = IPFA(contractAddress_);
        uint256 pricePerLicense = asset.pricePerLicense();
        // Note that this contract is implemented with Solidity
        // version >=0.8.0 which has built-in overflow checks,
        // therefore using SafeMath is not required.
        uint256 protocolFee = (pricePerLicense * _transactionFeeNumerator) /
            _transactionFeeDenominator;
        return pricePerLicense + protocolFee;
    }

    /// @notice Transfers a distributor fee to the distributor
    /// @param contractAddress_ The address of the PFA contract
    /// @param grossPrice_ The gross price of the access or license
    /// @param netPrice_ The net price of the access or license
    /// @param useERC20_ Whether to use ERC20 token payments
    function _transferDistributorFee(
        address contractAddress_,
        uint256 grossPrice_,
        uint256 netPrice_,
        bool useERC20_
    ) internal {
        IPFA asset = IPFA(contractAddress_);
        // Payout a distributor if associated with the asset.
        if (
            ERC165(contractAddress_).supportsInterface(type(IPFA).interfaceId)
        ) {
            address distributor = asset.distributorAddress();
            if (distributor != address(0)) {
                uint256 distributionFeeNumerator = asset
                    .distributionFeeNumerator();
                uint256 distributionFeeDenominator = asset
                    .distributionFeeDenominator();
                uint256 distributionFee = ((grossPrice_ - netPrice_) *
                    distributionFeeNumerator) / distributionFeeDenominator;
                if (useERC20_) {
                    require(
                        _erc20Token.transfer(distributor, distributionFee),
                        "SHARE052"
                    );
                } else {
                    payable(distributor).transfer(distributionFee);
                }
                emit Payment(msg.sender, distributor, distributionFee);
            }
        }
    }

    /// @notice Checks if a given PFA contract accepts ERC20 token payments
    /// @dev Uses ERC165 interface detection to check if contract implements IERC20Payable
    /// and then verifies if ERC20 payments are enabled.
    /// @param contractAddress_ The address of the PFA contract to check
    /// @return bool True if the contract accepts ERC20 payments, false otherwise
    function assetUsesERC20(
        address contractAddress_
    ) public view returns (bool) {
        return
            ERC165(contractAddress_).supportsInterface(
                type(IERC20Payable).interfaceId
            ) && IERC20Payable(contractAddress_).isERC20Payable();
    }

    /// @notice Instantiates the creator contract and calls the
    /// access method. If successful, this transaction produces a
    /// grant awarded to the sender with a corresponding TTL.
    function access(
        address contractAddress_,
        uint256 tokenId_,
        address recipient_
    ) public payable nonReentrant {
        require(
            isApprovedBuild(
                contractAddress_,
                CodeVerification.BuildType.PFA_UNIT
            ) ||
                isApprovedBuild(
                    contractAddress_,
                    CodeVerification.BuildType.PFA_COLLECTION
                ),
            "SHARE039"
        );

        IPFA asset = IPFA(contractAddress_);
        uint256 grossPrice = grossPricePerAccess(contractAddress_, tokenId_);
        uint256 netPrice = asset.pricePerAccess();
        bool useERC20 = assetUsesERC20(contractAddress_) &&
            this.isERC20Payable();

        if (useERC20) {
            require(msg.value == ERC20_PAYABLE_CALL_VALUE, "SHARE051");
            _transferERC20ThenApprove(
                msg.sender /* tokenOwner_ */,
                address(this) /* tokenSpender_ */,
                grossPrice /* totalTokenAmount_ */,
                address(asset) /* callableContractAddress_ */,
                netPrice /* callableTokenAmount_ */
            );
            asset.access{value: ERC20_PAYABLE_CALL_VALUE}(tokenId_, recipient_);
        } else {
            require(msg.value >= grossPrice, "SHARE011");
            asset.access{value: netPrice}(tokenId_, recipient_);
        }

        _transferDistributorFee(
            contractAddress_ /* contractAddress_ */,
            grossPrice /* grossPrice_ */,
            netPrice /* netPrice_ */,
            useERC20 /* useERC20_ */
        );

        _grantTimestamps[contractAddress_][recipient_] = block.timestamp;
        emit Grant(recipient_, contractAddress_, tokenId_);
        _transactionCount++;
        _transactionVolume += msg.value;
    }

    /// @notice If called with a `licenseeContract_` contract which
    /// has proof of inclusion of the supplied `licensorContract_`
    /// PFA address in its payout distribution table, records a
    /// license timestamp on chain which is read by decentralized
    /// distribution network (DDN) microservices to decrypt and serve
    /// the associated content for the tokenURI to users who have
    /// paid to access the licensee contract.
    function license(
        address licensorContract_,
        address licenseeContract_
    ) public payable nonReentrant {
        require(
            isApprovedBuild(
                licensorContract_,
                CodeVerification.BuildType.PFA_UNIT
            ) ||
                isApprovedBuild(
                    licensorContract_,
                    CodeVerification.BuildType.PFA_COLLECTION
                ),
            "SHARE039"
        );
        require(
            isApprovedBuild(
                licenseeContract_,
                CodeVerification.BuildType.PFA_UNIT
            ) ||
                isApprovedBuild(
                    licenseeContract_,
                    CodeVerification.BuildType.PFA_COLLECTION
                ),
            "SHARE000"
        );
        require(msg.sender == Ownable(licenseeContract_).owner(), "SHARE016");
        IPFA asset = IPFA(licensorContract_);
        uint256 grossPrice = grossPricePerLicense(licensorContract_);
        uint256 netPrice = asset.pricePerLicense();
        bool useERC20 = assetUsesERC20(licenseeContract_) &&
            this.isERC20Payable();

        if (useERC20) {
            require(msg.value == ERC20_PAYABLE_CALL_VALUE, "SHARE051");
            _transferERC20ThenApprove(
                msg.sender /* tokenOwner_ */,
                address(this) /* tokenSpender_ */,
                grossPrice /* totalTokenAmount_ */,
                address(licenseeContract_) /* callableContractAddress_ */,
                netPrice /* callableTokenAmount_ */
            );
            asset.license{value: ERC20_PAYABLE_CALL_VALUE}(licenseeContract_);
        } else {
            require(msg.value >= grossPrice, "SHARE024");
            asset.license{value: netPrice}(licenseeContract_);
        }

        _transferDistributorFee(
            licensorContract_ /* contractAddress_ */,
            grossPrice /* grossPrice_ */,
            netPrice /* netPrice_ */,
            useERC20 /* useERC20_ */
        );

        _licenseTimestamps[licensorContract_][licenseeContract_] = block
            .timestamp;
        emit License(licensorContract_, licenseeContract_);
    }

    /// @notice Returns the timestamp in seconds of the award of a
    /// grant recorded on chain for the access of the content
    /// associated with the supplied PFA and recipient address.
    function grantTimestamp(
        address contractAddress_,
        address recipient_
    ) public view returns (uint256) {
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
    function setCodeVerificationEnabled(
        bool enable
    ) public nonReentrant onlyOwner {
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

    /// @notice Adds keccak256 hashes of runtime bytecode for
    /// a set of approved source code builds for SHARE protocol
    /// interoperable contracts. If source code verification is turned
    /// on, the system will revert upon attempt to send ether to
    /// a contract built from non-approved source code.
    function addApprovedBuilds(
        ApprovedBuildHash[] memory buildHashes_,
        string memory compilerBinaryTarget_,
        string memory compilerVersion_,
        address authorAddress_
    ) public onlyOwner nonReentrant {
        for (uint256 i = 0; i < buildHashes_.length; i++) {
            bytes32 codeHash = buildHashes_[i].codeHash;
            CodeVerification.BuildType buildType = buildHashes_[i].buildType;
            require(
                (buildType == CodeVerification.BuildType.WALLET ||
                    buildType == CodeVerification.BuildType.SPLIT ||
                    buildType == CodeVerification.BuildType.PFA_UNIT ||
                    buildType == CodeVerification.BuildType.PFA_COLLECTION),
                "SHARE017"
            );
            _approvedHashes[codeHash] = ApprovedBuild(
                buildType,
                compilerBinaryTarget_,
                compilerVersion_,
                authorAddress_,
                true
            );
        }
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

    /// @notice Sets the ERC20 contract address (e.g., for USDC payments).
    function setERC20ContractAddress(
        address contractAddress_
    ) external onlyOwner {
        _setERC20ContractAddress(contractAddress_);
    }
}
