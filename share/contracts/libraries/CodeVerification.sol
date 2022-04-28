// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0 <0.9.0;
import "@openzeppelin/contracts/utils/Address.sol";

library CodeVerification {
    enum BuildType {
        WALLET, /* 0 */
        SPLIT, /* 1 */
        PFA_UNIT, /* 2 */
        PFA_COLLECTION /* 3 */
    }
    string public constant VERSION = "1.0.0";

    function readCodeHash(address address_) public view returns (bytes32) {
        bytes32 codeHash;
        assembly {
            codeHash := extcodehash(address_)
        }
        return codeHash;
    }
}
