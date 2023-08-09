const HDWalletProvider = require("@truffle/hdwallet-provider");
const mnemonicPhrase = process.env.MNEMONIC_PHRASE;
const RPC_ENDPOINT_OPTIMISM_GOERLI =
  process.env.RPC_ENDPOINT_OPTIMISM_GOERLI;
const RPC_ENDPOINT_POLYGON_MUMBAI =
  process.env.RPC_ENDPOINT_POLYGON_MUMBAI;
const RPC_ENDPOINT_POLYGON_MAINNET =
  process.env.RPC_ENDPOINT_POLYGON_MAINNET;

const SOLIDITY_COMPILER_VERSION = "0.8.11";

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 800000000,
    },
    optimism_goerli: {
      provider: () =>
        new HDWalletProvider(
          mnemonicPhrase,
          RPC_ENDPOINT_OPTIMISM_GOERLI
        ),
      network_id: 420,
      gas: 5500000,
      confirmations: 2,
      timeoutBlocks: 2000,
      networkCheckTimeout: 1000000,
      skipDryRun: true,
    },

    mumbai: {
      provider: () =>
        new HDWalletProvider(
          mnemonicPhrase,
          RPC_ENDPOINT_POLYGON_MUMBAI
        ),
      network_id: 80001,
      gas: 5500000,
      confirmations: 2,
      timeoutBlocks: 200,
      networkCheckTimeout: 1000000,
      skipDryRun: true,
    },

    polygon: {
      provider: () =>
        new HDWalletProvider(
          mnemonicPhrase,
          RPC_ENDPOINT_POLYGON_MAINNET
        ),
      network_id: 137,
      gas: 5000000,
      gasPrice: 350000000000,
      timeoutBlocks: 200,
      networkCheckTimeout: 10000,
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
