const eth_util = require("ethereumjs-util");

const CodeVerification = artifacts.require("CodeVerification");
const DEFAULT_ADDRESS_INDEX = 0;

contract("CodeVerification", (accounts) => {
  specify(
    "readCodeHash returns correct keccak256 for EOA",
    async () => {
      const verifier = await CodeVerification.deployed();
      const codeHash = await verifier.readCodeHash(
        accounts[DEFAULT_ADDRESS_INDEX]
      );
      assert.equal(
        codeHash,
        "0x" + eth_util.keccak256(Buffer.from("")).toString("hex")
      );
    }
  );
});
