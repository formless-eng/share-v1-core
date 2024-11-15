// const { expect } = require("chai");
// const PFAUnit = artifacts.require("PFAUnit");
// const MockUSDC = artifacts.require("MockUSDC");

let expect;
before(async () => {
  // Dynamically import chai and extract expect
  const chai = await import("chai");
  expect = chai.expect;
});

const PFAUnit = artifacts.require("PFAUnit");
const MockUSDC = artifacts.require("MockUSDC");


contract("PFAUnit", (accounts) => {
  let pfaUnit;
  let mockUSDC;
  const owner = accounts[0];
  const nonOwner = accounts[1];

  before(async () => {
    // Deploy the Mock USDC contract
    mockUSDC = await MockUSDC.new();

    // Deploy the PFAUnit contract and set the mockUSDC address as the ERC20 contract address
    pfaUnit = await PFAUnit.new();

    // Initialize PFAUnit with some parameters
    await pfaUnit.initialize(
      "/test/token/uri",
      "1000000000", // pricePerAccess
      300,          // grantTTL
      false,        // supportsLicensing
      0,            // pricePerLicense
      owner         // shareContractAddress, using owner address as a placeholder
    );
  });

  describe("setERC20ContractAddress", () => {
    it("should allow the owner to set the ERC20 contract address", async () => {
      // Set the ERC20 contract address to the mock USDC address
      await pfaUnit.setERC20ContractAddress(mockUSDC.address, { from: owner });

      const resultAddress = await pfaUnit.getERC20ContractAddress();
      expect(resultAddress).to.equal(mockUSDC.address);
    });

    it("should revert if a non-owner tries to set the ERC20 contract address", async () => {
      try {
        // Non-owner tries to set the ERC20 contract address
        await pfaUnit.setERC20ContractAddress(mockUSDC.address, { from: nonOwner });
        assert.fail("Expected revert not received");
      } catch (error) {
        expect(error.message).to.include("Ownable: caller is not the owner");
      }
    });
  });

  describe("getERC20ContractAddress", () => {
    it("should return the correct ERC20 contract address after setting it", async () => {
      // Set the ERC20 contract address to the mock USDC address
      await pfaUnit.setERC20ContractAddress(mockUSDC.address, { from: owner });

      const resultAddress = await pfaUnit.getERC20ContractAddress();
      expect(resultAddress).to.equal(mockUSDC.address);
    });
  });
});