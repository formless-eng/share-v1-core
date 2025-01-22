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
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./PFA.sol";
import "./libraries/CodeVerification.sol";
import "./libraries/Immutable.sol";
import "./interfaces/IERC20Payable.sol";

/// @title Standard pay-for-access (PFA) contract. Also implements
/// ERC-721 standard (G_NFT).
/// @author brandon@formless.xyz
contract PFAUnit is IERC20Payable, ERC721, PFA {
    /// @notice Emitted when a payment is sent to the owner of this
    /// PFA.
    event PaymentToOwner(address indexed owner, uint256 value);

    string public constant NAME = "SHARE";
    string public constant SYMBOL = "PFA";
    uint256 private constant UNIT_TOKEN_INDEX = 0;
    string internal _tokenURI;
    address private _erc20ContractAddress;
    constructor()
        ERC721(NAME, SYMBOL)
        LimitedOwnable(true /* WALLET */, true /* SPLIT */)
    {
        _safeMint(msg.sender, UNIT_TOKEN_INDEX);
    }

    /// @notice Initializes this contract.
    function initialize(
        string memory tokenURI_,
        uint256 pricePerAccess_,
        uint256 grantTTL_,
        bool supportsLicensing_,
        uint256 pricePerLicense_,
        address shareContractAddress_
    ) public onlyOwner {
        Immutable.setUnsignedInt256(_pricePerAccess, pricePerAccess_);
        Immutable.setUnsignedInt256(_grantTTL, grantTTL_);
        Immutable.setBoolean(_supportsLicensing, supportsLicensing_);
        if (!supportsLicensing_) {
            require(pricePerLicense_ == 0, "SHARE026");
        }
        Immutable.setUnsignedInt256(_pricePerLicense, pricePerLicense_);
        setShareContractAddress(shareContractAddress_);
        _tokenURI = tokenURI_;
        setInitialized();
    }

    /// @notice If called with a value equal to the price per access
    /// of this contract, records a grant timestamp on chain which is
    /// read by decentralized distribution network (DDN) microservices
    /// to decrypt and serve the associated content for the tokenURI.
    function accessNative(
        uint256 tokenId_,
        address recipient_
    ) internal payable nonReentrant afterInit {
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
        _transactionCount++;
    }

    function accessERC20(
        uint256 tokenId_,
        address recipient_
    ) internal nonReentrant afterInit {
        // 1. This function requires that the caller has approved
        // a deduction within the USDC contract with this
        // contract address as the spending entity.
        SHARE protocol = SHARE(shareContractAddress());
        address payeeAddress = owner();
        // 2. If this contract is responsible for paying a wallet,
        // this contract transfers the ERC20 token amount directly
        // to the wallet.
        if (
            protocol.isApprovedBuild(
                payeeAddress,
                CodeVerification.BuildType.WALLET
            )
        ) {
            IERC20(_erc20ContractAddress).transfer(
                payeeAddress,
                _pricePerAccess.value
            );
            _grantTimestamps[recipient_] = block.timestamp;
            emit PaymentToOwner(payeeAddress, _pricePerAccess.value);
            emit Grant(recipient_, tokenId_);
            _transactionCount++;
        } else if (
            // A PFA contract may only push revenue
            // to a wallet or a SHARE protocol split contract.
            // Therefore, the only other valid build type is
            // SPLIT.
            // https://docs.google.com/document/d/1tbpUkDHqrQXVrEkiNVSPKvBtbHdclOMlNl3O5HUwj0M/edit?tab=t.0#bookmark=id.f75vop7llte
            protocol.isApprovedBuild(
                payeeAddress,
                CodeVerification.BuildType.SPLIT
            )
        ) {
            // 3. If this contract is responsible for paying a contract,
            // this contract transfers the ERC20 token amount to itself,
            // within the USDC contract, then executes approve and
            // call on the downstream contract.
            {
                // Transfer
                IERC20(_erc20ContractAddress).transfer(
                    address(this),
                    _pricePerAccess.value
                );
                // Approve
                IERC20(_erc20ContractAddress).approve(
                    payeeAddress,
                    _pricePerAccess.value
                );
                // Call
                (bool success, ) = payable(payeeAddress).call{value: 0}("");
                require(success, "SHARE044");
            }
        } else {
            revert("SHARE021");
        }
    }

    function access(
        uint256 tokenId_,
        address recipient_
    ) public payable override nonReentrant afterInit {
        if (_erc20ContractAddress == address(0)) {
            require(msg.value >= _pricePerAccess.value, "SHARE005");
            accessNative(tokenId_, recipient_);
        } else {
            accessERC20(tokenId_, recipient_);
        }
    }

    /// @notice Returns the token URI (ERC-721) for the asset.
    /// @dev In SHARE, this URI corresponds to a decentralized
    /// distribution network (DDN) microservice endpoint which
    /// conditionally renders token metadata based on contract state.
    function tokenURI(
        uint256 tokenId_
    ) public view override returns (string memory) {
        require(tokenId_ == UNIT_TOKEN_INDEX, "SHARE004");
        return _tokenURI;
    }

    /// @notice Sets the token URI (ERC-721) for the asset.
    /// @dev In SHARE, this URI corresponds to a decentralized
    /// distribution network (DDN) microservice endpoint which
    /// conditionally renders token metadata based on contract state.
    function setTokenURI(
        string memory tokenURI_
    ) public nonReentrant onlyOwner {
        _tokenURI = tokenURI_;
    }

    /// @notice Sets the ERC20 contract address (e.g., for USDC payments).
    function setERC20ContractAddress(
        address contractAddress_
    ) external override onlyOwner {
        require(
            contractAddress_ != address(0),
            "Invalid ERC20 contract address"
        );
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
            interfaceId == type(IPFA).interfaceId ||
            interfaceId == type(IERC20Payable).interfaceId;
    }
}
