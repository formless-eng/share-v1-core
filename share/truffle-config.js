const HDWalletProvider = require("@truffle/hdwallet-provider");
const mnemonicPhrase = process.env.MNEMONIC_PHRASE;
const RPC_POLYGON_MUMBAI =
  "https://polygon-mumbai.g.alchemy.com/v2/lcwcK1Go85jK9KMMyIq4PKdzTWucCCCx";
const SOLIDITY_COMPILER_VERSION = "0.8.11";

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },
    mumbai: {
      provider: () =>
        new HDWalletProvider(mnemonicPhrase, RPC_POLYGON_MUMBAI),
      network_id: 80001,
      gas: 5500000,
      confirmations: 2,
      timeoutBlocks: 200,
      networkCheckTimeout: 1000000,
      skipDryRun: true,
    },
  },
  mocha: {},
  compilers: {
    solc: {
      version: SOLIDITY_COMPILER_VERSION,
      settings: {
        optimizer: {
          enabled: false,
        },
      },
    },
  },
  test_directory: "contracts/test",
};
