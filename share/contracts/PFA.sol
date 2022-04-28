pragma solidity >=0.8.0 <0.9.0;

import "./libraries/Immutable.sol";
import "./LimitedOwnable.sol";
import "./IPFA.sol";
import "./IPFACollection.sol";

abstract contract PFA is IPFA, LimitedOwnable {
    Immutable.UnsignedInt256 internal _pricePerAccess;
    Immutable.UnsignedInt256 internal _grantTTL;
    Immutable.UnsignedInt256 internal _licenseTTL;
    Immutable.Boolean internal _supportsLicensing;

    mapping(address => uint256) internal _grantTimestamps;
    mapping(address => uint256) internal _licenseTimestamps;

    /**
     * @dev Returns non-zero value if this asset requires payment for
     * access. Zero otherwise.
     */
    function pricePerAccess() public view afterInit returns (uint256) {
        return _pricePerAccess.value;
    }

    /**
     * @dev Sets the price per access on the asset.
     */
    function setPricePerAccess(uint256 pricePerAccess_)
        public
        override
        nonReentrant
        onlyOwner
        afterInit
    {
        require(!_supportsLicensing.value, "SHARE019");
        _pricePerAccess.locked = false;
        Immutable.setUnsignedInt256(_pricePerAccess, pricePerAccess_);
    }

    /**
     * @dev Grants or denies access to content based on creator
     * controlled terms.
     */
    function access(uint256 tokenId, address recipient)
        external
        virtual
        payable;

    function supportsLicensing() external view afterInit returns (bool) {
        return _supportsLicensing.value;
    }

    /**
     * @dev Returns timestamp as a Unix epoch in seconds for the access
     * grant award.
     */
    function grantTimestamp(address recipient_)
        public
        override
        view
        afterInit
        returns (uint256)
    {
        return _grantTimestamps[recipient_];
    }

    function licenseTimestamp(address recipient_)
        external
        view
        afterInit
        returns (uint256)
    {
        return _licenseTimestamps[recipient_];
    }

    /**
     * @dev Returns the "time to live" of the access grant in seconds.
     */
    function grantTTL() external view afterInit returns (uint256) {
        return _grantTTL.value;
    }

    function licenseTTL() external view afterInit returns (uint256) {
        return _licenseTTL.value;
    }

    function license(address recipient_) public nonReentrant afterInit {
        require(_supportsLicensing.value, "SHARE018");
        // PFAs issue licenses to collections because they have proof
        // that collections distribute transaction revenue to their
        // underlying PFAs. This proof is in the form of source code
        // verification as well as the proof of the inclusion of the
        // PFA address in the immutable collection child PFA address
        // table.
        SHARE protocol = SHARE(shareContractAddress());
        require(
            protocol.isApprovedBuild(
                recipient_,
                CodeVerification.BuildType.PFA_COLLECTION
            ),
            "SHARE000"
        );
        require(IPFACollection(recipient_).contains(address(this)), "SHARE001");
        _licenseTimestamps[recipient_] = block.timestamp;
        emit License(recipient_);
    }

    event Grant(address indexed recipient, uint256 indexed tokenId);
    event License(address indexed recipient);
}
