const SHARE = artifacts.require("SHARE");
const PFAUnit = artifacts.require("PFAUnit");
const CodeVerification = artifacts.require("CodeVerification");
const MockERC20 = artifacts.require("MockERC20");
const SL2RD = artifacts.require("SL2RD");
const OperatorRegistry = artifacts.require("OperatorRegistry");

const { UNIT_TOKEN_INDEX, usdcToWei } = require("../helper");

contract("SHARE payable with ERC20", (accounts) => {
  let _assetContract;
  let _mockERC20;
  let _shareContract;
  let _operatorRegistry;
  let _splitContract;
  let _verifier;
  const _defaultOwner = accounts[0];

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
    await _assetContract.setERC20ContractAddress(_mockERC20.address, {
      from: _defaultOwner,
    });
    await _shareContract.setERC20ContractAddress(_mockERC20.address, {
      from: _defaultOwner,
    });
  });

  specify("Access denial with ERC20 payment", async () => {
    let insufficientValueWeiExceptionThrown = false;
    let exceedsValueWeiExceptionThrown = false;
    try {
      await _shareContract.access(_assetContract.address, UNIT_TOKEN_INDEX, {
        from: _defaultOwner,
        value: usdcToWei(0.5),
      });
    } catch (error) {
      insufficientValueWeiExceptionThrown = true;
    }
    try {
      await _shareContract.access(_assetContract.address, UNIT_TOKEN_INDEX, {
        from: _defaultOwner,
        value: usdcToWei(10),
      });
    } catch (error) {
      exceedsValueWeiExceptionThrown = true;
    }
    assert.isTrue(
      insufficientValueWeiExceptionThrown && exceedsValueWeiExceptionThrown
    );
  });

  specify("Access grant with ERC20 payment", async () => {
    await _mockERC20.approve(
      _shareContract.address,
      await _shareContract.grossPricePerAccess(
        _assetContract.address,
        UNIT_TOKEN_INDEX
      ),
      {
        from: _defaultOwner,
      }
    );
    await _shareContract.access(_assetContract.address, UNIT_TOKEN_INDEX, {
      from: _defaultOwner,
    });
    assert.equal(
      (
        await _assetContract.getPastEvents("Grant", {
          filter: {
            recipient: _defaultOwner,
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
      await _assetContract.setDistributor(
        accounts[3],
        1 /* distributionFeeNumerator_ */,
        2 /* distributionFeeDenominator_ */,
        {
          from: _defaultOwner,
        }
      );
      await _mockERC20.approve(
        _shareContract.address,
        await _shareContract.grossPricePerAccess(
          _assetContract.address,
          UNIT_TOKEN_INDEX
        ),
        {
          from: _defaultOwner,
        }
      );
      await _shareContract.access(_assetContract.address, UNIT_TOKEN_INDEX, {
        from: _defaultOwner,
      });
      assert.equal(
        (
          await _assetContract.getPastEvents("Grant", {
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
          await _shareContract.getPastEvents("Payment", {
            filter: {
              from: _defaultOwner,
              recipient: accounts[3],
              value: usdcToWei(0.025),
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
      const transactionCount = 10;
      const batchSize = 100;
      const paymentValue = 1;

      // Deploy contracts under test:
      // SHARE protocol, PFA asset contract,
      // SL2RD split contract, and references to existing
      // operator registry and verifier contracts.
      const splitContract = await SL2RD.new();

      // Configure multiple stakeholders for SL2RD split
      // contract.
      const payeeAddress1 = accounts[1];
      const payeeAddress2 = accounts[2];
      const payeeAddresses = [payeeAddress1, payeeAddress2];

      // Approve new builds.
      await _shareContract.addApprovedBuild(
        await _verifier.readCodeHash(splitContract.address),
        /* codeHash = keccak256(SL2RD code) */ 1 /* buildType_ = SPLIT  */,
        "solc" /* compilerBinaryTarget_ */,
        "0.8.11+commit.d7f03943" /* compilerVersion_ */,
        _defaultOwner /* authorAddress_ */
      );

      await _assetContract.setDistributor(
        accounts[3],
        1 /* distributionFeeNumerator_ */,
        2 /* distributionFeeDenominator_ */,
        {
          from: _defaultOwner,
        }
      );

      // Initialize SL2RD split contract.
      await _splitContract.initialize(
        payeeAddresses /* addresses_ */,
        [0, 1] /* tokenIds_ */,
        0 /* communitySplitsBasisPoints_ */,
        _shareContract.address /* shareContractAddress_ */,
        _operatorRegistry.address /* operatorRegistryAddress_ */
      );

      await _splitContract.setPaymentBatchSize(batchSize);
      // Set ERC20 contract address for SHARE and PFA asset contracts.
      await _shareContract.setERC20ContractAddress(_mockERC20.address, {
        from: _defaultOwner,
      });
      await _assetContract.setERC20ContractAddress(_mockERC20.address, {
        from: _defaultOwner,
      });
      await _splitContract.setERC20ContractAddress(_mockERC20.address, {
        from: _defaultOwner,
      });

      // NOTE: Critical that ERC20 contract address is set
      // before transferring ownership to the split contract.
      await _assetContract.transferOwnership(_splitContract.address);

      // Execute bulk ERC20 payments to PFA asset contract.
      for (let i = 0; i < transactionCount; i += 1) {
        await _mockERC20.approve(
          _shareContract.address,
          usdcToWei(Math.ceil(1.05 * paymentValue)),
          {
            from: _defaultOwner,
          }
        );
        await _shareContract.access(_assetContract.address, UNIT_TOKEN_INDEX, {
          from: _defaultOwner,
          value: 0,
        });
        assert.equal(
          (
            await _assetContract.getPastEvents("Grant", {
              filter: {
                recipient: _defaultOwner,
                tokenId: UNIT_TOKEN_INDEX,
              },
            })
          ).length,
          1
        );
        _splitContract
          .getPastEvents("Payment", {
            fromBlock: 0,
            toBlock: "latest",
          })
          .then((events) => {
            assert.equal(events.length, (i + 1) * batchSize);
            for (let j = 0; j < batchSize; j++) {
              const event = events[events.length - batchSize + j];
              assert.equal(
                event.returnValues.value,
                usdcToWei(paymentValue) / batchSize, // Each recipient gets an equal share
                "Incorrect payment value"
              );
            }
          });
      }
    }
  );
});
