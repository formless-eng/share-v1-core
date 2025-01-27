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
import "./SHARE.sol";
import "./PFA.sol";
import "./libraries/CodeVerification.sol";
import "./libraries/Immutable.sol";
import "./interfaces/IPFACollection.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ERC20Payable.sol";

/// @title Standard pay-for-access (PFA) collection contract.
/// @author brandon@formless.xyz
/// @notice This contract can be used to implement PFA contract
/// playlisting and licensing.
contract PFACollection is PFA, IPFACollection, ERC721 {
    /// @notice Emitted when a payment is sent to a PFA item within
    /// this collection.
    event Payment(
        address indexed from,
        address indexed recipient,
        uint256 indexed addressIndex,
        uint256 value
    );

    /// @notice Emitted when a payment to a PFA item within this
    /// collection is skipped. Payment is skipped if and only if
    /// the `call` on the item PFA results in failure. Rather than
    /// reverting the transaction, the collection state is updated
    /// and the event is emitted.
    /// @dev It is critical that independent of the success of an
    /// individual PFA payment within this collection that the
    /// collection counter increment such that a valid state is
    /// always maintained for the lifetime of the collection.
    event ItemPaymentSkipped(address indexed owner, address indexed item);

    string public constant NAME = "PFA_COLLECTION";
    string public constant SYMBOL = "SHARE";
    uint256 private constant MAX_SIZE = 200;
    uint256 private constant UNIT_TOKEN_INDEX = 0;

    Immutable.AddressArray private _addresses;
    Immutable.AddressToBooleanMap private _addressMap;

    uint256 private _currentAddressIndex = 0;
    string internal _tokenURI;

    constructor()
        public
        ERC721(NAME, SYMBOL)
        LimitedOwnable(true /* WALLET */, true /* SPLIT */)
    {
        _safeMint(msg.sender, UNIT_TOKEN_INDEX);
    }

    /// @notice Initializes this collection with a set of PFA
    /// items specified by `addresses_`. The `tokenURI_` is a DDN
    /// microservice endpoint that returns PFA collection metadata,
    /// conditionally, based on the presence of a grant or license
    /// recorded on chain. On access of a collection, the collection
    /// price per access is sent to the collection owner and the
    /// remaining value is forwarded to the current child item. On
    /// each transaction the child item index is incremented such that
    /// as the number of transactions approaches infinity, revenues
    /// are proportionally distributed among all items in the
    /// collection. Collection price per access must be greater than
    /// or equal to the maximum price per access of any item within
    /// the collection. If a PFA supports licensing, e.g. it may be
    /// added to a collection, then the PFAs TTL is upgraded to the
    /// the grant TTL of the collection.
    function initialize(
        address[] memory addresses_,
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
        _tokenURI = tokenURI_;
        setShareContractAddress(shareContractAddress_);
        SHARE protocol = SHARE(shareContractAddress_);

        require(addresses_.length < MAX_SIZE, "SHARE008");
        for (uint256 i = 0; i < addresses_.length; i++) {
            address itemAddress = addresses_[i];
            require(
                protocol.isApprovedBuild(
                    itemAddress,
                    CodeVerification.BuildType.PFA_UNIT
                ),
                "SHARE009"
            );
            PFA item = PFA(itemAddress);
            require(pricePerAccess_ >= item.pricePerAccess(), "SHARE015");
            require(item.supportsLicensing(), "SHARE022");
            // If this collection supports licensing, the price
            // to sub-license the collection must be greater than or
            // equal to the maximum price to license any single item
            // within the collection.
            if (supportsLicensing_) {
                require(pricePerLicense_ >= item.pricePerLicense(), "SHARE027");
            }
            Immutable.pushAddress(_addresses, addresses_[i]);
            Immutable.insertBooleanAtAddress(_addressMap, itemAddress, true);
        }
        _addresses.locked = true;
        setInitialized();
    }

    /// @notice Returns the index of the item in the collection which
    /// is the next item to receive payment on an access of this
    /// collection.
    function addressIndex() public view afterInit returns (uint256) {
        return _currentAddressIndex;
    }

    /// @notice If called with a value equal to the price per access
    /// of this contract, records a grant timestamp on chain which is
    /// read by decentralized distribution network (DDN) microservices
    /// to decrypt and serve the associated content for the tokenURI.
    function accessUsingNativeToken(
        uint256 tokenId_,
        address recipient_
    ) internal afterInit {
        SHARE protocol = SHARE(shareContractAddress());
        address itemAddress = _addresses.value[_currentAddressIndex];
        PFA item = PFA(itemAddress);
        address owner = owner(); /* collection owner */
        address itemOwner = item.owner();

        require(msg.value >= _pricePerAccess.value, "SHARE010");

        _currentAddressIndex =
            (_currentAddressIndex + 1) %
            (_addresses.value.length);

        if (
            protocol.isApprovedBuild(
                itemOwner,
                CodeVerification.BuildType.WALLET
            ) ||
            protocol.isApprovedBuild(
                itemOwner,
                CodeVerification.BuildType.SPLIT
            )
        ) {
            // Pay for item access
            // We use call with encodeWithSignature here to guarantee
            // that a revert in the callee does not prevent the
            // caller state from updating, e.g. the counter
            // (_currentAddressIndex) _must_ increment in this
            // transaction.
            uint256 payment = item.pricePerAccess();
            (bool itemPaymentSuccess, ) = payable(address(item)).call{
                value: payment
            }(
                abi.encodeWithSignature(
                    "access(uint256,address)",
                    tokenId_,
                    recipient_
                )
            );
            if (itemPaymentSuccess) {
                emit Payment(
                    msg.sender,
                    address(item),
                    _currentAddressIndex,
                    payment
                );
            } else {
                emit ItemPaymentSkipped(itemOwner, address(item));
            }

            // Pay the collection owner
            (bool ownerPaymentSuccess, ) = payable(owner).call{
                value: _pricePerAccess.value - item.pricePerAccess()
            }("");
            require(ownerPaymentSuccess, "SHARE021");

            emit Payment(
                msg.sender,
                owner,
                _currentAddressIndex,
                _pricePerAccess.value - item.pricePerAccess()
            );

            _grantTimestamps[recipient_] = block.timestamp;
            emit Grant(recipient_, UNIT_TOKEN_INDEX);
        } else {
            emit ItemPaymentSkipped(itemOwner, address(item));
        }
        _transactionCount++;
    }

    /// @notice Processes an access request using ERC20 tokens as payment
    /// @dev This internal function handles the payment distribution when using ERC20 tokens:
    /// 1. Transfers the full payment from sender to this contract
    /// 2. Distributes payment between the current item owner and collection owner
    /// 3. Updates the collection state (grant timestamp, transaction count)
    /// @param tokenId_ The token ID being accessed (must be UNIT_TOKEN_INDEX)
    /// @param recipient_ The address that will receive the access grant
    function accessUsingERC20Token(
        uint256 tokenId_,
        address recipient_
    ) internal afterInit {
        address owner = owner();
        SHARE protocol = SHARE(shareContractAddress());

        // Determine the immediately payable child item
        // and its respective owner, subsequently,
        // increment the child item index to the next item
        // for future payments. This algorithm performs round-robin
        // distribution of payments to child items.
        address itemAddress = _addresses.value[_currentAddressIndex];
        PFA item = PFA(itemAddress);
        address itemOwner = item.owner();
        _currentAddressIndex =
            (_currentAddressIndex + 1) %
            (_addresses.value.length);

        if (
            protocol.isApprovedBuild(
                itemOwner,
                CodeVerification.BuildType.WALLET
            ) ||
            protocol.isApprovedBuild(
                itemOwner,
                CodeVerification.BuildType.SPLIT
            )
        ) {
            // Transfer the full payment from sender to this contract,
            // then approve the child contract to spend the payment
            // value and call the payable `access` function on the
            // child contract.
            uint256 itemPayment = item.pricePerAccess();
            _transferERC20ThenApprove(
                msg.sender /* tokenOwner_ */,
                address(this) /* tokenSpender_ */,
                _pricePerAccess.value /* totalTokenAmount_ */,
                itemAddress /* callableContractAddress_ */,
                itemPayment /* callableTokenAmount_ */
            );
            (bool itemPaymentSuccess, ) = payable(address(item)).call{
                value: ERC20_PAYABLE_CALL_VALUE
            }(
                abi.encodeWithSignature(
                    "access(uint256,address)",
                    tokenId_,
                    recipient_
                )
            );
            if (itemPaymentSuccess) {
                // Emit payment event for the child item
                // to indicate successful payment.
                emit Payment(
                    msg.sender,
                    address(item),
                    _currentAddressIndex,
                    itemPayment
                );
            } else {
                emit ItemPaymentSkipped(itemOwner, address(item));
            }
            // Distribute the remaining payment to the collection owner
            // and update the grant timestamp.
            require(
                _erc20Token.transfer(
                    owner,
                    _pricePerAccess.value - itemPayment
                ),
                "SHARE048"
            );
            (bool ownerPaymentSuccess, ) = payable(owner).call{
                value: ERC20_PAYABLE_CALL_VALUE
            }("");
            require(ownerPaymentSuccess, "SHARE021");
            // Emit payment event for the collection owner
            // to indicate successful payment.
            emit Payment(
                msg.sender,
                owner,
                _currentAddressIndex,
                _pricePerAccess.value - item.pricePerAccess()
            );

            _grantTimestamps[recipient_] = block.timestamp;
            emit Grant(recipient_, UNIT_TOKEN_INDEX);
        } else {
            emit ItemPaymentSkipped(itemOwner, address(item));
        }
        _transactionCount++;
    }

    /// @notice If called with a value equal to the price per access
    /// of this contract, records a grant timestamp on chain which is
    /// read by decentralized distribution network (DDN) microservices
    /// to decrypt and serve the associated content for the tokenURI.
    /// @param tokenId_ The token ID to access (must be UNIT_TOKEN_INDEX)
    /// @param recipient_ The address that will receive access to the content
    /// @dev Handles both ERC20 and native token payments through
    /// separate internal functions.
    function access(
        uint256 tokenId_,
        address recipient_
    ) public payable override nonReentrant afterInit {
        if (this.isERC20Payable()) {
            require(msg.value == ERC20_PAYABLE_CALL_VALUE, "SHARE051");
            accessUsingERC20Token(tokenId_, recipient_);
        } else {
            require(msg.value >= _pricePerAccess.value, "SHARE005");
            accessUsingNativeToken(tokenId_, recipient_);
        }
    }

    /// @notice Returns true if `account_` address is included in the
    /// payout distribution table of the collection.
    /// @dev Table for storing addresses is write-once (immutable
    /// post initialization). This means the return value of
    /// `contains` is stable in perpetuity after the initialization of
    /// a SHARE PFA collection.
    function contains(address account_) public view afterInit returns (bool) {
        return _addressMap.value[account_];
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

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override returns (bool) {
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IPFA).interfaceId ||
            interfaceId == type(IERC20Payable).interfaceId;
    }
}
