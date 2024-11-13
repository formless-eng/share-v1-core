require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.27",
  networks: {
    polygon: {
      url: "https://polygon-mainnet.g.alchemy.com/v2/gdJmXS5yNIuCsdWqO-iBA2V-pP5Y4cXl",
      accounts: ["9563d10243b6441eb76ebf2d37407a3984204fb314e4f046064361a6bc263f35"],
    }
  },
};
