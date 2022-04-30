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

contract SHARE is Ownable, ReentrancyGuard {
    string public constant VERSION = "1.0.0";
    bytes32
        private constant EOA_KECCAK256 = 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;
    uint256 public _transactionFeeNumerator = 1;
    uint256 public _transactionFeeDenominator = 20;
    bool public _codeVerificationEnabled = true;
    uint256 private constant UNIT_TOKEN_INDEX = 0;
    mapping(bytes32 => ApprovedBuild) internal approvedHashes;

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

    /**
     * @dev Used to set the transaction fee for the protocol. Calculated
     * using provided _numerator / _denominator.
     */
    function setTransactionFee(uint256 numerator_, uint256 denominator_)
        public
        nonReentrant
        onlyOwner
    {
        _transactionFeeNumerator = numerator_;
        _transactionFeeDenominator = denominator_;
    }

    /**
     * @dev Returns the consumer facing gross price to access the
     * the asset. This price is calculated using `creator price` +
     * `creator price` * `transaction fee`.
     */
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

    /**
     * @dev Instantiates the creator contract and calls the access
     * method. If successfuly, this transaction produces a Grant
     * event awarded to the sender.
     */
    function access(address contractAddress_, uint256 tokenId_)
        public
        payable
        nonReentrant
    {
        IPFA asset = IPFA(contractAddress_);
        uint256 grossPrice = grossPricePerAccess(contractAddress_, tokenId_);
        require(msg.value == grossPrice, "SHARE011");
        asset.access{value: asset.pricePerAccess()}(tokenId_, msg.sender);
    }

    function license(address licensorContract_, address licenseeContract_)
        public
        payable
        nonReentrant
    {
        require(msg.sender == Ownable(licenseeContract_).owner(), "SHARE016");
        IPFA asset = IPFA(licensorContract_);
        asset.license(licenseeContract_);
    }

    /**
     * @dev Withdraws contract balance.
     */
    function withdraw() public nonReentrant onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

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
        approvedHashes[codeHash] = ApprovedBuild(
            buildType_,
            compilerBinaryTarget_,
            compilerVersion_,
            authorAddress_,
            true
        );
    }

    function setCodeVerificationEnabled(bool enable)
        public
        nonReentrant
        onlyOwner
    {
        _codeVerificationEnabled = enable;
    }

    function isApprovedBuild(
        address address_,
        CodeVerification.BuildType buildType_
    ) public view returns (bool) {
        if (!_codeVerificationEnabled) {
            return true;
        } else {
            bytes32 codeHash = CodeVerification.readCodeHash(address_);
            if (approvedHashes[codeHash].exists) {
                return approvedHashes[codeHash].buildType == buildType_;
            } else {
                return false;
            }
        }
    }

    function isApprovedBuildHash(
        bytes32 hash,
        CodeVerification.BuildType buildType_
    ) public view returns (bool) {
        if (!_codeVerificationEnabled) {
            return true;
        } else {
            if (approvedHashes[hash].exists) {
                return approvedHashes[hash].buildType == buildType_;
            } else {
                return false;
            }
        }
    }
}
