const {
  calculateSplitIndexUsingPartition,
  normalizeAddress,
  usdcToWei,
  DEFAULT_ADDRESS_INDEX,
} = require("../helper");

const SHARE = artifacts.require("SHARE");
const SL2RD = artifacts.require("SL2RD");
const MockERC20 = artifacts.require("MockERC20");
const OperatorRegistry = artifacts.require("OperatorRegistry");
const PFAUnit = artifacts.require("PFAUnit");
const CodeVerification = artifacts.require("CodeVerification");

contract("SL2RD payable with ERC20", (accounts) => {
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

  specify("Payable with ERC20 token and single stakeholder", async () => {
    const payerAddress = accounts[DEFAULT_ADDRESS_INDEX];
    const payeeAddress = accounts[1];

    await _splitContract.initialize(
      [payeeAddress] /* addresses_ */,
      [0] /* tokenIds_ */,
      0 /* communitySplitsBasisPoints_ */,
      _shareContract.address /* shareContractAddress_ */,
      _operatorRegistry.address /* operatorRegistryAddress_ */
    );

    await _splitContract.setERC20ContractAddress(_mockERC20.address);

    // Payer account transfers $1 USDC to SL2RD contract.
    await _mockERC20.transfer(_splitContract.address, 1, {
      from: payerAddress,
    });

    // Payer account calls receive() with 0 value.
    await web3.eth.sendTransaction({
      from: payerAddress,
      to: _splitContract.address,
      value: web3.utils.toWei("0", "ether"),
    });

    // Confirm that the balance of the payee within the SL2RD contract
    // is updated to $1 in USDC.
    assert.equal(await _mockERC20.balanceOf(payeeAddress), 1);
  });

  specify("Payable with ERC20 token and multiple stakeholders", async () => {
    const payerAddress = accounts[DEFAULT_ADDRESS_INDEX];
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

    for (let i = 0; i < 2; i += 1) {
      // Payer account transfers $1 USDC to SL2RD contract.
      await _mockERC20.transfer(_splitContract.address, 1, {
        from: payerAddress,
      });

      // Payer account calls receive() with 0 value.
      await web3.eth.sendTransaction({
        from: payerAddress,
        to: _splitContract.address,
        value: web3.utils.toWei("0", "ether"),
        gas: 200000,
      });

      // Confirm that the balance of the payee within the SL2RD contract
      // is updated to $1 in USDC.
      assert.equal(await _mockERC20.balanceOf(payeeAddresses[i]), 1);
    }
  });

  specify("Multipart split comprehensive test with ERC20 token", async () => {
    const transactionCount = 60;
    const splitCount = 20;
    const shareholderIds = [];
    const ownerAddresses = [];
    const shareholders = [];

    for (let i = 0; i < splitCount; i += 1) {
      shareholderIds.push(i);
      ownerAddresses.push(accounts[0]);
      shareholders.push(accounts[i + 1]);
    }

    try {
      await _splitContract.multipartInitializationBegin(
        0 /* communitySplitsBasisPoints_ */,
        _shareContract.address /* shareContractAddress_ */,
        _operatorRegistry.address /* operatorRegistryAddress_ */
      );
      for (let partitionIndex = 0; partitionIndex < 5; partitionIndex += 1) {
        await _splitContract.multipartAddPartition(
          partitionIndex /* partitionIndex_ */,
          ownerAddresses.slice(
            calculateSplitIndexUsingPartition(partitionIndex, 4, 0),
            calculateSplitIndexUsingPartition(partitionIndex, 4, 4)
          ) /* addresses_ */,
          shareholderIds.slice(
            calculateSplitIndexUsingPartition(partitionIndex, 4, 0),
            calculateSplitIndexUsingPartition(partitionIndex, 4, 4)
          ) /* tokenIds_ */
        );
      }
      await _splitContract.multipartInitializationEnd();
    } catch (error) {
      console.log(error);
      console.log(error.message);
      assert(false, "Initialization failed");
    }

    await _splitContract.setERC20ContractAddress(_mockERC20.address);

    const shareholderMap = new Map();
    for (let i = 0; i < splitCount; i += 1) {
      shareholderMap.set(i, shareholders[i]);
    }

    const entries = Array.from(shareholderMap.entries());
    const halfLength = Math.ceil(entries.length / 2);

    for (let i = 0; i < entries.length; i += 1) {
      const tokenId = entries[i][0];
      const recipient = entries[i][1];
      if (i < halfLength) {
        await _splitContract.safeTransferFrom(accounts[0], recipient, tokenId);
      } else {
        await _splitContract.transferFrom(accounts[0], recipient, tokenId);
      }
    }

    for (let i = 0; i < transactionCount; i += 1) {
      // Payer account transfers $1 USDC to SL2RD contract.
      await _mockERC20.transfer(_splitContract.address, 1, {
        from: accounts[DEFAULT_ADDRESS_INDEX],
      });
      await web3.eth
        .sendTransaction({
          to: _splitContract.address,
          from: accounts[DEFAULT_ADDRESS_INDEX],
          value: web3.utils.toWei("0", "ether"),
          gas: 200000,
        })
        .then(function (receipt) {
          console.log(receipt);
          _splitContract
            .getPastEvents("Payment", {
              fromBlock: 0,
              toBlock: "latest",
            })
            .then((events) => {
              const mostRecentEvent = events[events.length - 1];
              assert.equal(events.length, i + 1);
              assert.equal(
                normalizeAddress(
                  mostRecentEvent.returnValues.recipient.toLowerCase()
                ),
                normalizeAddress(
                  shareholderMap.get(shareholderIds[i % shareholderIds.length])
                )
              );
              assert.equal(mostRecentEvent.returnValues.value, 1);
            });
        });
    }

    for (let i = 0; i < shareholders.length; i += 1) {
      assert.equal(await _mockERC20.balanceOf(shareholders[i]), 3);
    }
  });
});
