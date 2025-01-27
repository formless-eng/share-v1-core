const assert = require("assert");
const { DEFAULT_TOKEN_ID, usdcToWei } = require("../helper");
const PFAUnit = artifacts.require("PFAUnit");
exports.PFAUnit = PFAUnit;
const SL2RD = artifacts.require("SL2RD");
exports.SL2RD = SL2RD;
const MockERC20 = artifacts.require("MockERC20");
exports.MockERC20 = MockERC20;
const SHARE = artifacts.require("SHARE");
exports.SHARE = SHARE;
const OperatorRegistry = artifacts.require("OperatorRegistry");
exports.OperatorRegistry = OperatorRegistry;
const CodeVerification = artifacts.require("CodeVerification");
exports.CodeVerification = CodeVerification;

contract("PFAUnit with ERC20 payments", (accounts) => {
  let _assetContract;
  let _mockERC20;
  let _shareContract;
  let _operatorRegistry;
  let _splitContract;
  let _verifier;
  const _defaultOwner = accounts[0];
  const _nonOwner = accounts[1];

  beforeEach(async () => {
    _mockERC20 = await MockERC20.new();
    _assetContract = await PFAUnit.new();
    _shareContract = await SHARE.deployed();
    _operatorRegistry = await OperatorRegistry.deployed();
    _splitContract = await SL2RD.new();
    _verifier = await CodeVerification.deployed();
    await _assetContract.initialize(
      "/test/token/uri" /* tokenURI_ */,
      usdcToWei(1) /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      false /* supportsLicensing_ */,
      0 /* pricePerLicense_ */,
      _shareContract.address /* shareContractAddress_ */
    );
    await _shareContract.addApprovedBuild(
      await _verifier.readCodeHash(
        _assetContract.address
      ) /* codeHash = keccak256(SL2RD code) */,
      2 /* buildType_ = PFA_UNIT  */,
      "solc" /* compilerBinaryTarget_ */,
      "0.8.11+commit.d7f03943" /* compilerVersion_ */,
      _defaultOwner /* authorAddress_ */
    );
    await _shareContract.addApprovedBuild(
      await _verifier.readCodeHash(
        _splitContract.address
      ) /* codeHash = keccak256(SL2RD code) */,
      1 /* buildType_ = SPLIT  */,
      "solc" /* compilerBinaryTarget_ */,
      "0.8.11+commit.d7f03943" /* compilerVersion_ */,
      _defaultOwner /* authorAddress_ */
    );
  });

  describe("setERC20ContractAddress", () => {
    it("should allow the owner to set the ERC20 contract address", async () => {
      await _assetContract.setERC20ContractAddress(_mockERC20.address, {
        from: _defaultOwner,
      });
      const resultAddress = await _assetContract.getERC20ContractAddress();
      assert.strictEqual(resultAddress, _mockERC20.address);
    });

    it("should revert if a non-owner tries to set the ERC20 contract address", async () => {
      try {
        await _assetContract.setERC20ContractAddress(_mockERC20.address, {
          from: _nonOwner,
        });
        assert.fail("Expected revert not received");
      } catch (error) {
        assert(error.message.includes("Ownable: caller is not the owner"));
      }
    });
  });

  describe("getERC20ContractAddress", () => {
    it("should return the correct ERC20 contract address after setting it", async () => {
      await _assetContract.setERC20ContractAddress(_mockERC20.address, {
        from: _defaultOwner,
      });
      const resultAddress = await _assetContract.getERC20ContractAddress();
      assert.strictEqual(resultAddress, _mockERC20.address);
    });
  });

  specify("Access denial with ERC20 payment", async () => {
    await _assetContract.setERC20ContractAddress(_mockERC20.address);
    let insufficientValueWeiExceptionThrown = false;
    try {
      await _mockERC20.approve(_assetContract.address, usdcToWei(0.5), {
        from: _defaultOwner,
      });
      await _assetContract.access(DEFAULT_TOKEN_ID, _defaultOwner, {
        from: _defaultOwner,
        value: 0,
      });
    } catch (error) {
      assert(error.message.includes("SHARE050"));
      insufficientValueWeiExceptionThrown = true;
    }
    assert(insufficientValueWeiExceptionThrown);
  });

  specify("Access grant with ERC20 payment", async () => {
    await _assetContract.setERC20ContractAddress(_mockERC20.address);
    await _mockERC20.approve(_assetContract.address, usdcToWei(1), {
      from: _defaultOwner,
    });
    await _assetContract.access(DEFAULT_TOKEN_ID, _defaultOwner, {
      from: _defaultOwner,
      value: 0,
    });
    assert.equal(
      (
        await _assetContract.getPastEvents("Grant", {
          filter: {
            recipient: _defaultOwner,
            tokenId: DEFAULT_TOKEN_ID,
          },
        })
      ).length,
      1
    );
  });

  specify("Access grant with ERC20 payment and SL2RD splits", async () => {
    const payeeAddress1 = accounts[1];
    const payeeAddress2 = accounts[2];
    const payeeAddresses = [payeeAddress1, payeeAddress2];
    await _splitContract.initialize(
      payeeAddresses /* addresses_ */,
      [0, 1] /* tokenIds_ */,
      0 /* communitySplitsBasisPoints_ */,
      _shareContract.address /* shareContractAddress_ */,
      _operatorRegistry.address /* operatorRegistryAddress_ */
    );
    await _splitContract.setERC20ContractAddress(_mockERC20.address);
    await _assetContract.setERC20ContractAddress(_mockERC20.address);
    await _assetContract.transferOwnership(_splitContract.address);
    for (let i = 0; i < payeeAddresses.length; i += 1) {
      await _mockERC20.approve(_assetContract.address, usdcToWei(1), {
        from: _defaultOwner,
      });
      await _assetContract.access(DEFAULT_TOKEN_ID, _defaultOwner, {
        from: _defaultOwner,
        value: 0,
      });
      assert.equal(
        (
          await _assetContract.getPastEvents("Grant", {
            filter: {
              recipient: _defaultOwner,
              tokenId: DEFAULT_TOKEN_ID,
            },
          })
        ).length,
        1
      );
      assert.equal(await _mockERC20.balanceOf(payeeAddresses[i]), 1000000);
    }
  });
});
