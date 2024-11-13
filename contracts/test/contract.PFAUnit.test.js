const { expect } = require("chai");
const hre = require("hardhat");

describe("PFAUnit", function () {
  let pfaUnit, owner, erc20Address;

  before(async function () {
    // Get the owner account for initial deployment of PFAUnit
    [owner, nonOwner] = await ethers.getSigners();

    // Detect the network and set the USDC address accordingly
    const network = hre.network.name;
    if (network === "polygon") {
      erc20Address = "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359";
    } else if (network === "optimism") {
      erc20Address = "0x0b2c639c533813f4aa9d7837caf62653d097ff85";
    } else {
      throw new Error("Unsupported network");
    }

    // Deploy Immutable library
    const ImmutableFactory = await ethers.getContractFactory(
      "Immutable"
    );
    const immutableLib = await ImmutableFactory.deploy();
    await immutableLib.waitForDeployment();

    // Link Immutable library and deploy PFAUnit contract
    const PFAUnitFactory = await ethers.getContractFactory(
      "PFAUnit",
      {
        libraries: {
          Immutable: immutableLib.target,
        },
      }
    );
    pfaUnit = await PFAUnitFactory.deploy();
    await pfaUnit.waitForDeployment();
  });

  describe("setERC20ContractAddress", function () {
    it("should allow the owner to set the ERC20 contract address on supported networks", async function () {
      await pfaUnit
        .connect(owner)
        .setERC20ContractAddress(erc20Address);
      const resultAddress = await pfaUnit.getERC20ContractAddress();
      expect(resultAddress).to.equal(erc20Address);

      // Attempt by non-owner to set the ERC20 address should revert
      await expect(
        pfaUnit
          .connect(nonOwner)
          .setERC20ContractAddress(erc20Address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    describe("getERC20ContractAddress", function () {
      it("should return the correct ERC20 contract address on supported networks", async function () {
        await pfaUnit
          .connect(owner)
          .setERC20ContractAddress(erc20Address);
        const resultAddress = await pfaUnit.getERC20ContractAddress();
        expect(resultAddress).to.equal(erc20Address);
      });
    });
  });
});
