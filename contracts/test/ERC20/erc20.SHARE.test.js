const SHARE = artifacts.require("SHARE");
const PFAUnit = artifacts.require("PFAUnit");
const CodeVerification = artifacts.require("CodeVerification");
const MockERC20 = artifacts.require("MockERC20");
const SL2RD = artifacts.require("SL2RD");
const OperatorRegistry = artifacts.require("OperatorRegistry");

const {
  UNIT_TOKEN_INDEX,
  DEFAULT_ADDRESS_INDEX,
  NON_OWNER_ADDRESS_INDEX,
  usdcToWei,
  normalizeAddress,
} = require("../helper");

contract("SHARE payable with ERC20", (accounts) => {
  let mockERC20;
  const owner = accounts[DEFAULT_ADDRESS_INDEX];

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

  specify(
    "Bulk ERC20 payments to PFA with distributor, SL2RD splits and batch size 100",
    async () => {
      // Configure number of transactions and batch size
      // for this test.
      const NUM_TRANSACTIONS = 10;
      const BATCH_SIZE = 100;
      const PAYMENT_VALUE = 0.1;

      // Deploy contracts under test:
      // SHARE protocol, PFA asset contract,
      // SL2RD split contract, and references to existing
      // operator registry and verifier contracts.
      const shareContract = await SHARE.deployed();
      const assetContract = await PFAUnit.new();
      const splitContract = await SL2RD.new();
      const operatorRegistry = await OperatorRegistry.deployed();
      const verifier = await CodeVerification.deployed();

      // Configure multiple stakeholders for SL2RD split
      // contract.
      const payeeAddress1 = accounts[1];
      const payeeAddress2 = accounts[2];
      const payeeAddresses = [payeeAddress1, payeeAddress2];

      // Approve new builds.
      await shareContract.addApprovedBuild(
        await verifier.readCodeHash(assetContract.address),
        /* codeHash = keccak256(PFA code) */ 2 /* buildType_ = PFA_UNIT  */,
        "solc" /* compilerBinaryTarget_ */,
        "0.8.11+commit.d7f03943" /* compilerVersion_ */,
        accounts[DEFAULT_ADDRESS_INDEX] /* authorAddress_ */
      );

      await shareContract.addApprovedBuild(
        await verifier.readCodeHash(splitContract.address),
        /* codeHash = keccak256(SL2RD code) */ 1 /* buildType_ = SPLIT  */,
        "solc" /* compilerBinaryTarget_ */,
        "0.8.11+commit.d7f03943" /* compilerVersion_ */,
        accounts[DEFAULT_ADDRESS_INDEX] /* authorAddress_ */
      );

      // Initialize PFA asset contract.
      await assetContract.initialize(
        "/test/token/uri",
        usdcToWei(PAYMENT_VALUE),
        300,
        false,
        0,
        shareContract.address
      );

      await assetContract.setDistributor(
        accounts[3],
        1 /* distributionFeeNumerator_ */,
        2 /* distributionFeeDenominator_ */,
        {
          from: accounts[DEFAULT_ADDRESS_INDEX],
        }
      );

      // Initialize SL2RD split contract.
      await splitContract.initialize(
        payeeAddresses /* addresses_ */,
        [0, 1] /* tokenIds_ */,
        0 /* communitySplitsBasisPoints_ */,
        shareContract.address /* shareContractAddress_ */,
        operatorRegistry.address /* operatorRegistryAddress_ */
      );

      await splitContract.setPaymentBatchSize(BATCH_SIZE);

      // Set ERC20 contract address for SHARE and PFA asset contracts.
      await shareContract.setERC20ContractAddress(mockERC20.address, {
        from: owner,
      });
      await assetContract.setERC20ContractAddress(mockERC20.address, {
        from: owner,
      });
      await splitContract.setERC20ContractAddress(mockERC20.address, {
        from: owner,
      });

      // NOTE: Critical that ERC20 contract address is set
      // before transferring ownership to the split contract.
      await assetContract.transferOwnership(splitContract.address);

      // Execute bulk ERC20 payments to PFA asset contract.
      for (let i = 0; i < NUM_TRANSACTIONS; i += 1) {
        await mockERC20.approve(
          shareContract.address,
          usdcToWei(Math.ceil(1.05 * PAYMENT_VALUE)),
          {
            from: owner,
          }
        );
        await shareContract.access(assetContract.address, UNIT_TOKEN_INDEX, {
          from: accounts[DEFAULT_ADDRESS_INDEX],
          value: 0,
        });
        assert.equal(
          (
            await assetContract.getPastEvents("Grant", {
              filter: {
                recipient: accounts[DEFAULT_ADDRESS_INDEX],
                tokenId: UNIT_TOKEN_INDEX,
              },
            })
          ).length,
          1
        );
        splitContract
          .getPastEvents("Payment", {
            fromBlock: 0,
            toBlock: "latest",
          })
          .then((events) => {
            assert.equal(events.length, (i + 1) * BATCH_SIZE);
            for (let j = 0; j < BATCH_SIZE; j++) {
              const event = events[events.length - BATCH_SIZE + j];
              console.log(event.returnValues.value);
              assert.equal(
                event.returnValues.value,
                usdcToWei(PAYMENT_VALUE) / BATCH_SIZE, // Each recipient gets an equal share
                "Incorrect payment value"
              );
            }
          });
      }
    }
  );
});
