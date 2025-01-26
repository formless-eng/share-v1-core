const assert = require("assert");
const { DEFAULT_ADDRESS_INDEX, DEFAULT_TOKEN_ID } = require("../helper");
const PFAUnit = artifacts.require("PFAUnit");
const SL2RD = artifacts.require("SL2RD");
const MockERC20 = artifacts.require("MockERC20");
const SHARE = artifacts.require("SHARE");
const OperatorRegistry = artifacts.require("OperatorRegistry");
const CodeVerification = artifacts.require("CodeVerification");

contract("PFAUnit", (accounts) => {
  let pfaUnit;
  let mockERC20;
  const owner = accounts[0];
  const nonOwner = accounts[1];

  before(async () => {
    mockERC20 = await MockERC20.new();
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
      await pfaUnit.setERC20ContractAddress(mockERC20.address, { from: owner });
      const resultAddress = await pfaUnit.getERC20ContractAddress();
      assert.strictEqual(resultAddress, mockERC20.address);
    });

    it("should revert if a non-owner tries to set the ERC20 contract address", async () => {
      try {
        await pfaUnit.setERC20ContractAddress(mockERC20.address, {
          from: nonOwner,
        });
        assert.fail("Expected revert not received");
      } catch (error) {
        assert(error.message.includes("Ownable: caller is not the owner"));
      }
    });
  });

  describe("getERC20ContractAddress", () => {
    it("should return the correct ERC20 contract address after setting it", async () => {
      await pfaUnit.setERC20ContractAddress(mockERC20.address, { from: owner });
      const resultAddress = await pfaUnit.getERC20ContractAddress();
      assert.strictEqual(resultAddress, mockERC20.address);
    });
  });

  specify("Access denial with ERC20 payment", async () => {
    const shareContract = await SHARE.deployed();
    const assetContract = await PFAUnit.new();
    await assetContract.initialize(
      "/test/token/uri" /* tokenURI_ */,
      "1000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      true /* supportsLicensing_ */,
      0 /* pricePerLicense_ */,
      shareContract.address /* shareContractAddress_ */
    );

    await assetContract.setERC20ContractAddress(mockERC20.address);

    const insufficientValueWei = "1000";
    let insufficientValueWeiExceptionThrown = false;
    try {
      await mockERC20.approve(assetContract.address, insufficientValueWei, {
        from: accounts[DEFAULT_ADDRESS_INDEX],
      });
      await assetContract.access(
        DEFAULT_TOKEN_ID,
        accounts[DEFAULT_ADDRESS_INDEX],
        {
          from: accounts[DEFAULT_ADDRESS_INDEX],
          value: 0,
        }
      );
    } catch (error) {
      console.log(error);
      assert(error.message.includes("SHARE050"));
      insufficientValueWeiExceptionThrown = true;
    }
    assert(insufficientValueWeiExceptionThrown);
  });

  specify("Access grant with ERC20 payment", async () => {
    const shareContract = await SHARE.deployed();
    const assetContract = await PFAUnit.new();
    await assetContract.initialize(
      "/test/token/uri" /* tokenURI_ */,
      "1000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      true /* supportsLicensing_ */,
      0 /* pricePerLicense_ */,
      shareContract.address /* shareContractAddress_ */
    );

    await assetContract.setERC20ContractAddress(mockERC20.address);
    await mockERC20.approve(assetContract.address, "1000000", {
      from: accounts[DEFAULT_ADDRESS_INDEX],
    });

    await assetContract.access(
      DEFAULT_TOKEN_ID,
      accounts[DEFAULT_ADDRESS_INDEX],
      {
        from: accounts[DEFAULT_ADDRESS_INDEX],
        value: 0,
      }
    );

    assert.equal(
      (
        await assetContract.getPastEvents("Grant", {
          filter: {
            recipient: accounts[DEFAULT_ADDRESS_INDEX],
            tokenId: DEFAULT_TOKEN_ID,
          },
        })
      ).length,
      1
    );
  });

  specify("Access grant with ERC20 payment and SL2RD splits", async () => {
    const shareContract = await SHARE.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    const assetContract = await PFAUnit.new();
    const splitContract = await SL2RD.new();
    const verifier = await CodeVerification.deployed();

    await assetContract.initialize(
      "/test/token/uri" /* tokenURI_ */,
      "1000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      true /* supportsLicensing_ */,
      0 /* pricePerLicense_ */,
      shareContract.address /* shareContractAddress_ */
    );

    const payerAddress = accounts[DEFAULT_ADDRESS_INDEX];
    const payeeAddress1 = accounts[1];
    const payeeAddress2 = accounts[2];
    const payeeAddresses = [payeeAddress1, payeeAddress2];

    await splitContract.initialize(
      payeeAddresses /* addresses_ */,
      [0, 1] /* tokenIds_ */,
      0 /* communitySplitsBasisPoints_ */,
      shareContract.address /* shareContractAddress_ */,
      operatorRegistry.address /* operatorRegistryAddress_ */
    );

    await shareContract.addApprovedBuild(
      await verifier.readCodeHash(
        splitContract.address
      ) /* codeHash = keccak256(SL2RD code) */,
      1 /* buildType_ = SPLIT  */,
      "solc" /* compilerBinaryTarget_ */,
      "0.8.11+commit.d7f03943" /* compilerVersion_ */,
      accounts[DEFAULT_ADDRESS_INDEX] /* authorAddress_ */
    );

    await splitContract.setERC20ContractAddress(mockERC20.address);
    await assetContract.setERC20ContractAddress(mockERC20.address);
    await assetContract.transferOwnership(splitContract.address);

    for (let i = 0; i < 2; i += 1) {
      await mockERC20.approve(assetContract.address, "1000000", {
        from: payerAddress,
      });

      await assetContract.access(DEFAULT_TOKEN_ID, payerAddress, {
        from: payerAddress,
        value: 0,
      });

      assert.equal(
        (
          await assetContract.getPastEvents("Grant", {
            filter: {
              recipient: payerAddress,
              tokenId: DEFAULT_TOKEN_ID,
            },
          })
        ).length,
        1
      );
      assert.equal(await mockERC20.balanceOf(payeeAddresses[i]), 1000000);
    }
  });
});
