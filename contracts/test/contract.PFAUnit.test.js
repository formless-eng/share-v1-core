const assert = require("assert");
const PFAUnit = artifacts.require("PFAUnit");
const MockUSDC = artifacts.require("MockUSDC");

contract("PFAUnit", (accounts) => {
  let pfaUnit;
  let mockUSDC;
  const owner = accounts[0];
  const nonOwner = accounts[1];

  before(async () => {
    mockUSDC = await MockUSDC.new();
    pfaUnit = await PFAUnit.new();
    await pfaUnit.initialize(
      "/test/token/uri",
      "1000000000",
      300,
      false,
      0,
      owner
    );
  });

  describe("setERC20ContractAddress", () => {
    it("should allow the owner to set the ERC20 contract address", async () => {
      await pfaUnit.setERC20ContractAddress(mockUSDC.address, { from: owner });
      const resultAddress = await pfaUnit.getERC20ContractAddress();
      assert.strictEqual(resultAddress, mockUSDC.address);
    });

    it("should revert if a non-owner tries to set the ERC20 contract address", async () => {
      try {
        await pfaUnit.setERC20ContractAddress(mockUSDC.address, { from: nonOwner });
        assert.fail("Expected revert not received");
      } catch (error) {
        assert(error.message.includes("Ownable: caller is not the owner"));
      }
    });
  });

  describe("getERC20ContractAddress", () => {
    it("should return the correct ERC20 contract address after setting it", async () => {
      await pfaUnit.setERC20ContractAddress(mockUSDC.address, { from: owner });
      const resultAddress = await pfaUnit.getERC20ContractAddress();
      assert.strictEqual(resultAddress, mockUSDC.address);
    });
  });
});