const { usdcToWei, popEventFIFO, UNIT_TOKEN_INDEX } = require("../helper");
const SHARE = artifacts.require("SHARE");
const PFAUnit = artifacts.require("PFAUnit");
const PFACollection = artifacts.require("PFACollection");
const MockERC20 = artifacts.require("MockERC20");
const SL2RD = artifacts.require("SL2RD");
const CodeVerification = artifacts.require("CodeVerification");

contract("PFACollection with ERC20 payments", (accounts) => {
  let _assetContract;
  let _mockERC20;
  let _shareContract;
  let _splitContract;
  let _verifier;
  const _defaultOwner = accounts[0];

  beforeEach(async () => {
    _mockERC20 = await MockERC20.new();
    _assetContract = await PFAUnit.new();
    _shareContract = await SHARE.new();
    _splitContract = await SL2RD.new();
    _verifier = await CodeVerification.deployed();
    await _assetContract.initialize(
      "/test/token/uri" /* tokenURI_ */,
      usdcToWei(0.5) /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      true /* supportsLicensing_ */,
      usdcToWei(0.2) /* pricePerLicense_ */,
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

  specify("License 1 PFA with 1 transaction using ERC20", async () => {
    await _shareContract.setCodeVerificationEnabled(false);
    const collection = await PFACollection.new();
    await collection.initialize(
      [_assetContract.address] /* addresses_ */,
      "/test/collection/uri" /* tokenURI_ */,
      usdcToWei(1) /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      false /* supportsLicensing_ */,
      0 /* pricePerLicense_ */,
      _shareContract.address /* shareContractAddress_ */
    );

    await _assetContract.setERC20ContractAddress(_mockERC20.address);
    await collection.setERC20ContractAddress(_mockERC20.address);
    await _mockERC20.approve(_assetContract.address, usdcToWei(0.5), {
      from: _defaultOwner,
    });
    await _assetContract.license(collection.address);
    await _mockERC20.approve(collection.address, usdcToWei(1), {
      from: _defaultOwner,
    });
    await collection.access(UNIT_TOKEN_INDEX, _defaultOwner, {
      from: _defaultOwner,
      value: 0,
    });
    const assetEvents = await _assetContract.getPastEvents("PaymentToOwner", {
      fromBlock: 0,
      toBlock: "latest",
    });
    const collectionEvents = await collection.getPastEvents("Payment", {
      fromBlock: 0,
      toBlock: "latest",
    });
    // The revenue (1 USD) will be split as follows:
    // 0.50 to the PFA
    // 0.50 (remaining balance) to the collection owner
    assert.equal(popEventFIFO(assetEvents).returnValues.value, usdcToWei(0.5));
    assert.equal(
      popEventFIFO(collectionEvents).returnValues.value,
      usdcToWei(0.5)
    );
    assert.equal(
      popEventFIFO(collectionEvents).returnValues.recipient,
      _assetContract.address
    );
    assert.equal(
      popEventFIFO(collectionEvents, 1).returnValues.value,
      usdcToWei(0.5)
    );
    assert.equal(
      popEventFIFO(collectionEvents, 1).returnValues.recipient,
      _defaultOwner
    );
    // The DDN will look for:
    // (1) a grant on the collection
    // (2) a license on the underlying PFA issued _to the collection_
    assert.equal(
      (
        await collection.getPastEvents("Grant", {
          fromBlock: 0,
          toBlock: "latest",
          filter: {
            recipient: _defaultOwner,
            tokenId: UNIT_TOKEN_INDEX,
          },
        })
      ).length,
      1
    );
    assert.equal(
      (
        await _assetContract.getPastEvents("License", {
          fromBlock: 0,
          toBlock: "latest",
          filter: {
            recipient: collection.address,
          },
        })
      ).length,
      1
    );
  });
});
