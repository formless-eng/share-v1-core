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

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./PFA.sol";
import "./libraries/CodeVerification.sol";
import "./libraries/Immutable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract PFAUnit is
    PFA,
    ERC721 /* G_NFT */
{
    event PaymentToOwner(address indexed owner, uint256 value);

    string public constant NAME = "SHARE";
    string public constant SYMBOL = "PFA";
    uint256 private constant UNIT_TOKEN_INDEX = 0;

    string internal _tokenURI;

    constructor()
        public
        ERC721(NAME, SYMBOL)
        LimitedOwnable(
            true, /* WALLET */
            true, /* SPLIT */
            false, /* PFA_UNIT */
            false /* PFA_COLLECTION */
        )
    {
        _safeMint(msg.sender, UNIT_TOKEN_INDEX);
    }

    function initialize(
        string memory tokenURI_,
        uint256 pricePerAccess_,
        uint256 grantTTL_,
        bool supportsLicensing_,
        address shareContractAddress_
    ) public onlyOwner {
        Immutable.setUnsignedInt256(_pricePerAccess, pricePerAccess_);
        Immutable.setUnsignedInt256(_grantTTL, grantTTL_);
        Immutable.setBoolean(_supportsLicensing, supportsLicensing_);
        setShareContractAddress(shareContractAddress_);
        _tokenURI = tokenURI_;
        setInitialized();
    }

    /**
     * @dev Pays the price per access and emits a Grant event upon
     * success.
     */
    function access(uint256 tokenId_, address recipient_)
        public
        override
        payable
        nonReentrant
        afterInit
    {
        require(msg.value == _pricePerAccess.value, "SHARE005");
        address owner = owner();
        // Since this contract is a LimitedOwnable, the code which
        // may reside at the owner address is restricted to approved
        // hashes, therefore the following call is explicitly safe.
        (bool success, ) = payable(owner).call{value: msg.value}("");
        require(success, "SHARE021");
        // The grants table contains the timestamp of the grant award.
        // This is used in determining the expiration of the access
        // TTL.
        _grantTimestamps[recipient_] = block.timestamp;
        emit PaymentToOwner(owner, msg.value);
        emit Grant(recipient_, tokenId_);
    }

    /**
     * @dev Returns the token URI for the asset.
     */
    function tokenURI(uint256 tokenId_)
        public
        override
        view
        returns (string memory)
    {
        require(tokenId_ == UNIT_TOKEN_INDEX, "SHARE004");
        return _tokenURI;
    }

    /**
     * @dev Sets the asset token URI.
     */
    function setTokenURI(string memory tokenURI_)
        public
        nonReentrant
        onlyOwner
    {
        _tokenURI = tokenURI_;
    }
}
