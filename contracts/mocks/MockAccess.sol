// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockAccess {
    IERC20 private immutable _token;
    uint256 private immutable _price;
    address public lastRecipient;
    uint256 public lastTokenId;
    uint256 public lastValue;

    constructor(address token_, uint256 price_) {
        _token = IERC20(token_);
        _price = price_;
    }

    function access(uint256 tokenId_, address recipient_) external payable {
        lastTokenId = tokenId_;
        lastRecipient = recipient_;
        lastValue = msg.value;
        if (_price > 0) {
            require(_token.transferFrom(msg.sender, address(this), _price));
        }
    }
}
