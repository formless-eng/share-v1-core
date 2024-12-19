// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    string public constant VERSION = "1.0.0";
    
    constructor() ERC20("Mock USDC", "USDC") {
        // Mint an initial supply of tokens for testing
        // Mint 1 million USDC tokens to deployer's address
        _mint(msg.sender, 1000000 * 10 ** decimals()); 
    }
}