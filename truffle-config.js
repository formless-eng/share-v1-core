const HDWalletProvider = require("@truffle/hdwallet-provider");
const mnemonicPhrase = process.env.MNEMONIC_PHRASE;
const RPC_ENDPOINT_OPTIMISM_GOERLI = process.env.RPC_ENDPOINT_OPTIMISM_GOERLI;
const RPC_ENDPOINT_OPTIMISM_MAINNET = process.env.RPC_ENDPOINT_OPTIMISM_MAINNET;
const RPC_ENDPOINT_OPTIMISM_SEPOLIA = process.env.RPC_ENDPOINT_OPTIMISM_SEPOLIA;
const RPC_ENDPOINT_POLYGON_MUMBAI = process.env.RPC_ENDPOINT_POLYGON_MUMBAI;
const RPC_ENDPOINT_POLYGON_MAINNET = process.env.RPC_ENDPOINT_POLYGON_MAINNET;
const RPC_ENDPOINT_ETHEREUM_MAINNET = process.env.RPC_ENDPOINT_ETHEREUM_MAINNET;
const RPC_ENDPOINT_BASE_MAINNET = process.env.RPC_ENDPOINT_BASE_MAINNET;
const RPC_ENDPOINT_BASE_SEPOLIA = process.env.RPC_ENDPOINT_BASE_SEPOLIA;
const GAS_VALUE = process.env.GAS_VALUE ? process.env.GAS_VALUE : 5500000;

const SOLIDITY_COMPILER_VERSION = "0.8.11";

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 800000000,
    },
    ethereum: {
      provider: () =>
        new HDWalletProvider(mnemonicPhrase, RPC_ENDPOINT_ETHEREUM_MAINNET),
      network_id: 1,
      gas: GAS_VALUE,
      confirmations: 2,
      timeoutBlocks: 2000,
      networkCheckTimeout: 1000000,
      skipDryRun: true,
    },

    optimism_goerli: {
      provider: () =>
        new HDWalletProvider(mnemonicPhrase, RPC_ENDPOINT_OPTIMISM_GOERLI),
      network_id: 420,
      gas: GAS_VALUE,
      confirmations: 2,
      timeoutBlocks: 2000,
      networkCheckTimeout: 1000000,
      skipDryRun: true,
    },

    optimism_sepolia: {
      provider: () =>
        new HDWalletProvider(mnemonicPhrase, RPC_ENDPOINT_OPTIMISM_SEPOLIA),
      network_id: 11155420,
      gas: GAS_VALUE,
      confirmations: 2,
      timeoutBlocks: 2000,
      networkCheckTimeout: 1000000,
      skipDryRun: true,
    },

    mumbai: {
      provider: () =>
        new HDWalletProvider(mnemonicPhrase, RPC_ENDPOINT_POLYGON_MUMBAI),
      network_id: 80001,
      gas: GAS_VALUE,
      confirmations: 2,
      timeoutBlocks: 200,
      networkCheckTimeout: 1000000,
      skipDryRun: true,
    },

    polygon: {
      provider: () =>
        new HDWalletProvider(mnemonicPhrase, RPC_ENDPOINT_POLYGON_MAINNET),
      network_id: 137,
      gas: GAS_VALUE,
      gasPrice: 250000000000,
      timeoutBlocks: 200,
      networkCheckTimeout: 1000000,
      skipDryRun: true,
    },

    optimism: {
      provider: () =>
        new HDWalletProvider(mnemonicPhrase, RPC_ENDPOINT_OPTIMISM_MAINNET),
      network_id: 10,
      gas: GAS_VALUE,
      confirmations: 2,
      timeoutBlocks: 2000,
      networkCheckTimeout: 1000000,
      skipDryRun: true,
    },

    base: {
      provider: () =>
        new HDWalletProvider(mnemonicPhrase, RPC_ENDPOINT_BASE_MAINNET),
      network_id: 8453,
      gas: GAS_VALUE,
      gasPrice: 34000000,
      confirmations: 2,
      timeoutBlocks: 2000,
      networkCheckTimeout: 1000000,
      skipDryRun: true,
    },

    base_sepolia: {
      provider: () =>
        new HDWalletProvider(mnemonicPhrase, RPC_ENDPOINT_BASE_SEPOLIA),
      network_id: 84532,
      gas: GAS_VALUE,
      gasPrice: 1500000,
      confirmations: 2,
      timeoutBlocks: 2000,
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
          enabled: true,
        },
      },
    },
  },
  test_directory: "contracts/test",
};
