// SPDX-License-Identifier: UNLICENSED
// ⣿⣿⣿⣿⣿⠀⠀⣰⣿⣿⣿⣷⡀⠀⠀⣶⣶⣶⣦⡀⠀⠀⠀⣶⣶⡄⠀⠀⣶⣶⡆⠀⠀⣶⣶⠀⠀⠀⠀⢰⣶⣶⣶⣶⢀⠀⠀⣤⣶⣶⣦⡀⠀⠀⠀⣴⣶⣶⣦⠀
// ⣿⣿⠀⠀⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⠀⢻⣿⠀⠀⠀⣿⣿⣿⠀⢸⣿⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⢸⣿⡇⠀⣿⣿⠀⠀⣾⣿⠁⠈⣿⡇
// ⣿⣿⠀⠀⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⠀⣸⣿⠀⠀⠀⣿⣿⣿⡀⣿⡟⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⣿⣿⡀⠀⠀⠀⠀⠘⣿⣷⠀⠀⠀
// ⣿⣿⠿⠿⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⣿⣿⡟⠀⠀⠀⣿⣿⣿⣷⣿⠀⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡿⠿⠀⠀⠀⠀⠀⢿⣿⣦⠀⠀⠀⠀⠈⣿⣿⡄⠀
// ⣿⣿⠀⠀⠀⠀⠀⣿⣿⠀⢸⣿⡇⠀⠀⣿⣿⠈⣿⣷⠀⠀⠀⣿⣿⢸⣿⣿⠈⣿⡇⠀⠀⣿⣿⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⢀⣀⠀⠙⣿⣧⠀⠀⣀⣀⠀⠻⣿⡆
// ⣿⣿⠀⠀⠀⠀⠀⢿⣿⣤⣾⣿⠇⠀⠀⣿⣿⠀⣿⣿⠀⠀⠀⣿⣿⠀⣿⡇⠈⣿⡇⠀⠀⣿⣿⣤⣤⡄⠀⢸⣿⣧⣤⣤⡄⠀⢸⣿⣆⠀⣿⣿⠀⠀⣿⣿⡀⢀⣿⣿
// ⠛⠛⠀⠀⠀⠀⠀⠈⠛⠿⠿⠛⠀⠀⠀⠛⠛⠀⠘⠛⠃⠀⠀⠛⠛⠀⠛⠀⠈⠛⠃⠀⠀⠛⠛⠛⠛⠃⠀⠘⠛⠛⠛⠛⠃⠀⠀⠙⠿⠿⠟⠁⠀⠀⠀⠛⠿⠿⠛⠀
// https://formless.xyz/opportunities
//⠀
pragma solidity >=0.8.0 <0.9.0;

/// @title Standard pay-for-access (PFA) contract interface for SHARE.
/// @author brandon@formless.xyz
interface IPFA {
    /// @notice Returns the price per access in wei for content backed
    /// by this contract.
    function pricePerAccess() external view returns (uint256);

    /// @notice Sets the price per access in wei for content backed
    /// by this contract.
    function setPricePerAccess(uint256 pricePerAccess_) external;

    /// @notice If called with a value equal to the price per access
    /// of this contract, records a grant timestamp on chain which is
    /// read by decentralized distribution network (DDN) microservices
    /// to decrypt and serve the associated content for the tokenURI.
    function access(uint256 tokenId, address recipient) external payable;

    /// @notice Returns the timestamp in seconds of the award of a
    /// grant recorded on chain for the access of the content
    /// associated with this PFA.
    function grantTimestamp(address recipient_) external view returns (uint256);

    /// @notice Returns the time-to-live (TTL) in seconds of an
    /// awarded access grant for this PFA. Access to the associated
    ///content expires at `grant award timestamp + grant TTL`.
    function grantTTL() external view returns (uint256);

    /// @notice Returns true if this PFA supports licensing, where
    /// licensing is the ability for a separate contract to forward
    /// payment to this PFA in exchange for the ability to perpetually
    /// serve the underlying content on its behalf. For example,
    /// licensing may be used to achieve transaction gated playlisting
    /// of a collection of PFAs.
    function supportsLicensing() external view returns (bool);

    /// @notice Returns the price per license in wei for content
    /// backed by this contract.
    function pricePerLicense() external view returns (uint256);

    /// @notice If called with a `recipient` (licensee) contract which
    /// has proof of inclusion of this PFA (licensor) address in its
    /// payout distribution table, records a license timestamp on
    /// chain which is read by decentralized distribution (DDN)
    /// microservices to decrypt and serve the associated content for
    /// the tokenURI to users who have paid to access the licensee
    /// contract.
    /// @dev Proof of inclusion is in the form of source code
    /// verification of the licensee, as well as the assertion of
    /// immutable state of the licensee contract payout distribution
    /// table. Immutable state is verified using knowledge of the
    /// keccak256 hash of the runtime bytecode of the source code
    /// for approved licensees which implement a write-once
    /// distribution address table.
    /// TODO(brandon): update docs w/ payable license function.
    function license(address recipient) external payable;

    /// @notice Returns the timestamp in seconds of the award of a
    /// grant recorded on chain for the access of the content
    /// associated with this PFA.
    function licenseTimestamp(address recipient_)
        external
        view
        returns (uint256);
}
