const SHARE = artifacts.require("SHARE");
const PFAUnit = artifacts.require("PFAUnit");
const S2RD = artifacts.require("S2RD");
const CodeVerification = artifacts.require("CodeVerification");
const PFACollection = artifacts.require("PFACollection");
const MockERC20 = artifacts.require("MockERC20");

const DEFAULT_ADDRESS_INDEX = 0;
const UNIT_TOKEN_INDEX = 0;
const NON_OWNER_ADDRESS_INDEX = 1;
const GRANT_TTL_PRECISION_SEC = 10;
const LICENSE_TTL_PRECISION_SEC = 10;

contract("SHARE payable with ERC20", (accounts) => {
  let mockERC20;
  const owner = accounts[0];

  before(async () => {
    mockERC20 = await MockERC20.new();
  });

  specify("Access denial with ERC20", async () => {
    const shareContract = await SHARE.new();
    const assetContract = await PFAUnit.new();
    const insufficientValueWei = "1000";
    const exceedsValueWei = "2000000000";
    let insufficientValueWeiExceptionThrown = false;
    let exceedsValueWeiExceptionThrown = false;
    await shareContract.setERC20ContractAddress(mockERC20.address, {
      from: owner,
    });

    try {
      await shareContract.access(assetContract.address, UNIT_TOKEN_INDEX, {
        from: accounts[DEFAULT_ADDRESS_INDEX],
        value: insufficientValueWei,
      });
    } catch (error) {
      insufficientValueWeiExceptionThrown = true;
    }

    try {
      await shareContract.access(assetContract.address, UNIT_TOKEN_INDEX, {
        from: accounts[DEFAULT_ADDRESS_INDEX],
        value: exceedsValueWei,
      });
    } catch (error) {
      exceedsValueWeiExceptionThrown = true;
    }

    assert.isTrue(
      insufficientValueWeiExceptionThrown && exceedsValueWeiExceptionThrown
    );
  });

  specify("Access grant with ERC20", async () => {
    const shareContract = await SHARE.new();
    const assetContract = await PFAUnit.new();
    const verifier = await CodeVerification.deployed();
    await shareContract.setERC20ContractAddress(mockERC20.address, {
      from: owner,
    });
    await shareContract.addApprovedBuild(
      await verifier.readCodeHash(assetContract.address),
      /* codeHash = keccak256(PFA code) */ 2 /* buildType_ = PFA_UNIT  */,
      "solc" /* compilerBinaryTarget_ */,
      "0.8.11+commit.d7f03943" /* compilerVersion_ */,
      accounts[NON_OWNER_ADDRESS_INDEX] /* authorAddress_ */
    );
    await assetContract.initialize(
      "/test/token/uri",
      "1000000000",
      300,
      false,
      0,
      owner
    );
    await shareContract.access(assetContract.address, UNIT_TOKEN_INDEX, {
      from: accounts[NON_OWNER_ADDRESS_INDEX],
      value: "1050000000",
    });
    assert.equal(
      (
        await assetContract.getPastEvents("Grant", {
          filter: {
            recipient: accounts[NON_OWNER_ADDRESS_INDEX],
            tokenId: UNIT_TOKEN_INDEX,
          },
        })
      ).length,
      1
    );
  });

  specify(
    "Access grant with 50% distribution fee enabled on PFA using ERC20",
    async () => {
      const shareContract = await SHARE.new();
      const assetContract = await PFAUnit.new();
      const verifier = await CodeVerification.deployed();
      await shareContract.setERC20ContractAddress(mockERC20.address, {
        from: owner,
      });
      await shareContract.addApprovedBuild(
        await verifier.readCodeHash(assetContract.address),
        /* codeHash = keccak256(PFA code) */ 2 /* buildType_ = PFA_UNIT  */,
        "solc" /* compilerBinaryTarget_ */,
        "0.8.11+commit.d7f03943" /* compilerVersion_ */,
        accounts[NON_OWNER_ADDRESS_INDEX] /* authorAddress_ */
      );
      await assetContract.initialize(
        "/test/token/uri" /* tokenURI_ */,
        "1000000000" /* pricePerAccess_ */,
        300 /* grantTTL_ */,
        true /* supportsLicensing_ */,
        0 /* pricePerLicense_ */,
        shareContract.address /* shareContractAddress_ */
      );
      await assetContract.setDistributor(
        accounts[3],
        1 /* distributionFeeNumerator_ */,
        2 /* distributionFeeDenominator_ */,
        {
          from: accounts[DEFAULT_ADDRESS_INDEX],
        }
      );
      await shareContract.access(assetContract.address, UNIT_TOKEN_INDEX, {
        from: accounts[NON_OWNER_ADDRESS_INDEX],
        value: "1050000000",
      });
      assert.equal(
        (
          await assetContract.getPastEvents("Grant", {
            filter: {
              recipient: accounts[NON_OWNER_ADDRESS_INDEX],
              tokenId: UNIT_TOKEN_INDEX,
            },
          })
        ).length,
        1
      );
      assert.equal(
        (
          await shareContract.getPastEvents("Payment", {
            filter: {
              from: accounts[NON_OWNER_ADDRESS_INDEX],
              recipient: accounts[3],
              value: "25000000",
            },
          })
        ).length,
        1
      );
    }
  );
});
