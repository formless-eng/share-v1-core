const SHARE = artifacts.require("SHARE");
const PFAUnit = artifacts.require("PFAUnit");
const DEFAULT_ADDRESS_INDEX = 0;
const NON_OWNER_ADDRESS_INDEX = 1;
const DEFAULT_TOKEN_ID = 0;
const GRANT_TTL_PRECISION_SEC = 5;

contract("PFAUnit", (accounts) => {
  specify("Contract initialization", async () => {
    const shareContract = await SHARE.deployed();
    const assetContract = await PFAUnit.deployed();
    await assetContract.initialize(
      "/test/token/uri" /* tokenURI_ */,
      "1000000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      false /* supportsLicensing_ */,
      0 /* pricePerLicense_ */,
      shareContract.address /* shareContractAddress_ */
    );

    assert.equal(
      accounts[DEFAULT_ADDRESS_INDEX],
      await assetContract.ownerOf(DEFAULT_TOKEN_ID)
    );

    assert.equal(await assetContract.pricePerAccess.call(), 1000000000);

    assert.equal(
      await assetContract.tokenURI.call(DEFAULT_TOKEN_ID),
      "/test/token/uri"
    );

    assert.equal(await assetContract.name(), "SHARE");
    assert.equal(await assetContract.symbol(), "PFA");
  });

  specify("Contract initialization with zero licensing cost", async () => {
    const shareContract = await SHARE.deployed();
    const assetContract = await PFAUnit.new();
    await assetContract.initialize(
      "/test/token/uri" /* tokenURI_ */,
      "1000000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      true /* supportsLicensing_ */,
      0 /* pricePerLicense_ */,
      shareContract.address /* shareContractAddress_ */
    );

    assert.equal(await assetContract.pricePerLicense.call(), 0);
  });

  specify("Contract initialization with non-zero licensing cost", async () => {
    const shareContract = await SHARE.deployed();
    const assetContract = await PFAUnit.new();
    await assetContract.initialize(
      "/test/token/uri" /* tokenURI_ */,
      "1000000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      true /* supportsLicensing_ */,
      "1000000000" /* pricePerLicense_ */,
      shareContract.address /* shareContractAddress_ */
    );

    assert.equal(await assetContract.pricePerLicense.call(), 1000000000);
  });

  specify("Only owner sets price per access", async () => {
    const assetContract = await PFAUnit.deployed();

    try {
      await assetContract.setPricePerAccess(100000, {
        from: accounts[NON_OWNER_ADDRESS_INDEX],
      });
    } catch (error) {
      return;
    }

    assert(false, "Expected throw not received.");
  });

  specify("Only owner sets token URI", async () => {
    const assetContract = await PFAUnit.deployed();

    try {
      await assetContract.setTokenURI("/test/uri", {
        from: accounts[NON_OWNER_ADDRESS_INDEX],
      });
    } catch (error) {
      return;
    }

    assert(false, "Expected throw not received.");
  });

  specify("Owner can change price per access", async () => {
    const assetContract = await PFAUnit.deployed();

    await assetContract.setPricePerAccess(777, {
      from: accounts[DEFAULT_ADDRESS_INDEX],
    });

    assert.equal(await assetContract.pricePerAccess(), 777);
  });

  specify("Owner can change token URI", async () => {
    const assetContract = await PFAUnit.deployed();

    await assetContract.setTokenURI("/test/uri", {
      from: accounts[DEFAULT_ADDRESS_INDEX],
    });

    assert.equal(await assetContract.tokenURI(DEFAULT_TOKEN_ID), "/test/uri");
  });

  specify("Only owner sets distributor", async () => {
    const assetContract = await PFAUnit.new();
    try {
      await assetContract.initialize(
        "/test/token/uri" /* tokenURI_ */,
        "1000000000" /* pricePerAccess_ */,
        300 /* grantTTL_ */,
        true /* supportsLicensing_ */,
        0 /* pricePerLicense_ */,
        shareContract.address /* shareContractAddress_ */
      );
      await assetContract.setDistributor(
        accounts[DEFAULT_ADDRESS_INDEX],
        1,
        2,
        {
          from: accounts[NON_OWNER_ADDRESS_INDEX],
        }
      );
    } catch (error) {
      return;
    }
    assert(false, "Expected throw not received.");
  });

  specify("Owner can set distributor", async () => {
    const shareContract = await SHARE.deployed();
    const assetContract = await PFAUnit.new();
    await assetContract.initialize(
      "/test/token/uri" /* tokenURI_ */,
      "1000000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      true /* supportsLicensing_ */,
      0 /* pricePerLicense_ */,
      shareContract.address /* shareContractAddress_ */
    );
    await assetContract.setDistributor(accounts[DEFAULT_ADDRESS_INDEX], 1, 2, {
      from: accounts[DEFAULT_ADDRESS_INDEX],
    });
    assert.equal(
      await assetContract.distributorAddress(),
      accounts[DEFAULT_ADDRESS_INDEX]
    );
    assert.equal(await assetContract.distributionFeeNumerator(), 1);
    assert.equal(await assetContract.distributionFeeDenominator(), 2);
  });

  specify("Access denial", async () => {
    const shareContract = await SHARE.deployed();
    const assetContract = await PFAUnit.new();
    await assetContract.initialize(
      "/test/token/uri" /* tokenURI_ */,
      "1000000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      true /* supportsLicensing_ */,
      0 /* pricePerLicense_ */,
      shareContract.address /* shareContractAddress_ */
    );
    const insufficientValueWei = "1000";
    let insufficientValueWeiExceptionThrown = false;
    try {
      await assetContract.access(
        DEFAULT_TOKEN_ID,
        accounts[NON_OWNER_ADDRESS_INDEX],
        {
          from: accounts[NON_OWNER_ADDRESS_INDEX],
          value: insufficientValueWei,
        }
      );
    } catch (error) {
      insufficientValueWeiExceptionThrown = true;
    }
    assert.isTrue(insufficientValueWeiExceptionThrown);
  });

  specify("Access grant", async () => {
    const assetContract = await PFAUnit.deployed();

    await assetContract.setPricePerAccess(1000000000, {
      from: accounts[DEFAULT_ADDRESS_INDEX],
    });

    await assetContract.access(
      DEFAULT_TOKEN_ID,
      accounts[NON_OWNER_ADDRESS_INDEX],
      {
        from: accounts[NON_OWNER_ADDRESS_INDEX],
        value: 1000000000,
      }
    );

    assert.equal(
      (
        await assetContract.getPastEvents("Grant", {
          filter: {
            recipient: accounts[NON_OWNER_ADDRESS_INDEX],
            tokenId: DEFAULT_TOKEN_ID,
          },
        })
      ).length,
      1
    );
  });

  specify("Access grant TTL start time is correct", async () => {
    const assetContract = await PFAUnit.deployed();

    await assetContract.setPricePerAccess(1000000000, {
      from: accounts[DEFAULT_ADDRESS_INDEX],
    });

    await assetContract.access(
      DEFAULT_TOKEN_ID,
      accounts[NON_OWNER_ADDRESS_INDEX],
      {
        from: accounts[NON_OWNER_ADDRESS_INDEX],
        value: 1000000000,
      }
    );

    const grantTimestamp = await assetContract.grantTimestamp(
      accounts[NON_OWNER_ADDRESS_INDEX],
      {
        from: accounts[NON_OWNER_ADDRESS_INDEX],
      }
    );

    assert.isBelow(
      Math.abs(grantTimestamp.toString() - Math.round(Date.now() / 1000)),
      GRANT_TTL_PRECISION_SEC
    );
  });

  specify("PFA transaction count increment", async () => {
    const shareContract = await SHARE.deployed();
    const assetContract = await PFAUnit.new();
    await assetContract.initialize(
      "/test/asset/uri" /* tokenURI_ */,
      "1000000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      true /* supportsLicensing_ */,
      0 /* pricePerLicense_ */,
      shareContract.address /* shareContractAddress_ */
    );

    for (let i = 0; i < 10; i++) {
      await assetContract.access(
        DEFAULT_TOKEN_ID,
        accounts[NON_OWNER_ADDRESS_INDEX],
        {
          from: accounts[NON_OWNER_ADDRESS_INDEX],
          value: 1000000000,
        }
      );
      const txCount = await assetContract._transactionCount.call();
      console.log(`tx count: ${txCount}`);
      assert.equal(txCount, i + 1);
    }
  });
});
