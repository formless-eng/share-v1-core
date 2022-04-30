// SPDX-License-Identifier: UNLICENSED
// ⣿⣿⣿⣿⣿⠀⠀⣰⣿⣿⣿⣷⡀⠀⠀⣶⣶⣶⣦⡀⠀⠀⠀⣶⣶⡄⠀⠀⣶⣶⡆⠀⠀⣶⣶⠀⠀⠀⠀⢰⣶⣶⣶⣶⢀⠀⠀⣤⣶⣶⣦⡀⠀⠀⠀⣴⣶⣶⣦⠀
// ⣿⣿⠀⠀⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⠀⢻⣿⠀⠀⠀⣿⣿⣿⠀⢸⣿⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⢸⣿⡇⠀⣿⣿⠀⠀⣾⣿⠁⠈⣿⡇
// ⣿⣿⠀⠀⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⠀⣸⣿⠀⠀⠀⣿⣿⣿⡀⣿⡟⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⣿⣿⡀⠀⠀⠀⠀⠘⣿⣷⠀⠀⠀
// ⣿⣿⠿⠿⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⣿⣿⡟⠀⠀⠀⣿⣿⣿⣷⣿⠀⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡿⠿⠀⠀⠀⠀⠀⢿⣿⣦⠀⠀⠀⠀⠈⣿⣿⡄⠀
// ⣿⣿⠀⠀⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⠈⣿⣷⠀⠀⠀⣿⣿⢸⣿⣿⠈⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⢀⣀⠀⠙⣿⣧⠀⠀⣀⣀⠀⠻⣿⡆
// ⣿⣿⠀⠀⠀⠀⠀⢿⣿⣤⣾⣿⠇⠀⠀⣿⣿⠀⣿⣿⠀⠀⠀⣿⣿⠀⣿⡇⠈⣿⡇⠀⠀⣿⣿⣤⣤⡄⠀⢸⣿⣧⣤⣤⡄⠀⢸⣿⣆⠀⣿⣿⠀⠀⣿⣿⡀⢀⣿⣿
// ⠛⠛⠀⠀⠀⠀⠀⠈⠛⠿⠿⠛⠀⠀⠀⠛⠛⠀⠘⠛⠃⠀⠀⠛⠛⠀⠛⠀⠈⠛⠃⠀⠀⠛⠛⠛⠛⠃⠀⠘⠛⠛⠛⠛⠃⠀⠀⠙⠿⠿⠟⠁⠀⠀⠀⠛⠿⠿⠛⠀
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "..//PFA.sol";
import "../libraries/CodeVerification.sol";
import "../libraries/Immutable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockPFARevertsOnAccess is PFA, ERC721 {
    uint256 private constant UNIT_TOKEN_INDEX = 0;

    constructor()
        public
        ERC721("SHARE", "MOCK_PFA")
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
        setInitialized();
    }

    function access(uint256 tokenId_, address recipient_)
        public
        override
        payable
        nonReentrant
        afterInit
    {
        revert("forced revert");
    }
}
