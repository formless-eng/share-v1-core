const {
  usdcToWei,
  popEventFIFO,
  DEFAULT_ADDRESS_INDEX,
  UNIT_TOKEN_INDEX,
} = require("../helper");
const SHARE = artifacts.require("SHARE");
const PFAUnit = artifacts.require("PFAUnit");
const PFACollection = artifacts.require("PFACollection");
const MockERC20 = artifacts.require("MockERC20");

contract("PFACollection", (accounts) => {
  let mockERC20;

  before(async () => {
    mockERC20 = await MockERC20.new();
  });

  specify("License 1 PFA with 1 transaction using ERC20", async () => {
    const collection = await PFACollection.new();
    const shareContract = await SHARE.deployed();
    await shareContract.setCodeVerificationEnabled(false);
    const pfa1 = await PFAUnit.new();
    await pfa1.initialize(
      "/test/asset/uri" /* tokenURI_ */,
      usdcToWei(0.5) /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      true /* supportsLicensing_ */,
      usdcToWei(0.5) /* pricePerLicense_ */,
      shareContract.address /* shareContractAddress_ */
    );
    await collection.initialize(
      [pfa1.address] /* addresses_ */,
      "/test/collection/uri" /* tokenURI_ */,
      usdcToWei(1) /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      false /* supportsLicensing_ */,
      0 /* pricePerLicense_ */,
      shareContract.address /* shareContractAddress_ */
    );

    await pfa1.setERC20ContractAddress(mockERC20.address);
    await collection.setERC20ContractAddress(mockERC20.address);
    await mockERC20.approve(pfa1.address, usdcToWei(0.5), {
      from: accounts[DEFAULT_ADDRESS_INDEX],
    });
    await pfa1.license(collection.address);
    await mockERC20.approve(collection.address, usdcToWei(1), {
      from: accounts[DEFAULT_ADDRESS_INDEX],
    });
    await collection.access(UNIT_TOKEN_INDEX, accounts[DEFAULT_ADDRESS_INDEX], {
      from: accounts[DEFAULT_ADDRESS_INDEX],
      value: 0,
    });
    const pfaPaymentEvents = await pfa1.getPastEvents("PaymentToOwner", {
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
    assert.equal(
      popEventFIFO(pfaPaymentEvents).returnValues.value,
      usdcToWei(0.5)
    );
    assert.equal(
      popEventFIFO(collectionEvents).returnValues.value,
      usdcToWei(0.5)
    );
    assert.equal(
      popEventFIFO(collectionEvents).returnValues.recipient,
      pfa1.address
    );
    assert.equal(
      popEventFIFO(collectionEvents, 1).returnValues.value,
      usdcToWei(0.5)
    );
    assert.equal(
      popEventFIFO(collectionEvents, 1).returnValues.recipient,
      accounts[DEFAULT_ADDRESS_INDEX]
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
            recipient: accounts[DEFAULT_ADDRESS_INDEX],
            tokenId: UNIT_TOKEN_INDEX,
          },
        })
      ).length,
      1
    );
    assert.equal(
      (
        await pfa1.getPastEvents("License", {
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
