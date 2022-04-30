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
      shareContract.address /* shareContractAddress_ */
    );

    assert.equal(
      accounts[DEFAULT_ADDRESS_INDEX],
      await assetContract.ownerOf(DEFAULT_TOKEN_ID)
    );

    assert.equal(
      await assetContract.pricePerAccess.call(),
      1000000000
    );

    assert.equal(
      await assetContract.tokenURI.call(DEFAULT_TOKEN_ID),
      "/test/token/uri"
    );

    assert.equal(await assetContract.name(), "SHARE");
    assert.equal(await assetContract.symbol(), "PFA");
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

    assert.equal(
      await assetContract.tokenURI(DEFAULT_TOKEN_ID),
      "/test/uri"
    );
  });

  specify("Access denial", async () => {
    const assetContract = await PFAUnit.deployed();
    const insufficientValueWei = "1000";
    const exceedsValueWei = "2000000000";
    let insufficientValueWeiExceptionThrown = false;
    let exceedsValueWeiExceptionThrown = false;

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

    try {
      await assetContract.access(
        DEFAULT_TOKEN_ID,
        accounts[NON_OWNER_ADDRESS_INDEX],
        {
          from: accounts[NON_OWNER_ADDRESS_INDEX],
          value: exceedsValueWei,
        }
      );
    } catch (error) {
      exceedsValueWeiExceptionThrown = true;
    }

    assert.isTrue(
      insufficientValueWeiExceptionThrown &&
        exceedsValueWeiExceptionThrown
    );
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
      Math.abs(
        grantTimestamp.toString() - Math.round(Date.now() / 1000)
      ),
      GRANT_TTL_PRECISION_SEC
    );
  });
});
