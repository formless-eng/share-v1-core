const {
  DEFAULT_ADDRESS_INDEX,
  NON_OWNER_ADDRESS_INDEX,
  MAX_SL2RD_PARTITION_SIZE,
  calculateSplitIndexUsingPartition,
  normalizeAddress,
} = require("./helper");

const SHARE = artifacts.require("SHARE");
const SL2RD = artifacts.require("SL2RD");
const PFAUnit = artifacts.require("PFAUnit");
const MockERC20 = artifacts.require("MockERC20");
const OperatorRegistry = artifacts.require("OperatorRegistry");

contract("SL2RD", (accounts) => {
  const mockERC20Address = "0x1234567890abcdef1234567890abcdef12345678"; // Mock ERC20 contract address

  before(async () => {
    this._singletonShareContract = await SHARE.deployed();
    this._singletonOperatorRegistry = await OperatorRegistry.deployed();
  });

  beforeEach(async () => {
    this._singletonSplitContract = await SL2RD.new();

    const ownerAddresses = Array(10).fill(accounts[0]);
    const uniformCollaboratorsIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    await this._singletonSplitContract.initialize(
      ownerAddresses /* addresses_ */,
      uniformCollaboratorsIds /* tokenIds_ */,
      0 /* communitySplitsBasisPoints_ */,
      this._singletonShareContract.address /* shareContractAddress_ */,
      this._singletonOperatorRegistry.address /* operatorRegistryAddress_ */
    );
  });

  specify("Contract initialization", async () => {
    const shareContract = await SHARE.deployed();
    const splitContract = await SL2RD.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    const ownerAddresses = Array(10).fill(accounts[0]);
    const uniformCollaboratorsIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    await splitContract.initialize(
      ownerAddresses /* addresses_ */,
      uniformCollaboratorsIds /* tokenIds_ */,
      0 /* communitySplitsBasisPoints_ */,
      shareContract.address /* shareContractAddress_ */,
      operatorRegistry.address /* operatorRegistryAddress_ */
    );
    assert.equal(accounts[DEFAULT_ADDRESS_INDEX], await splitContract.owner());
    assert.equal(await splitContract.tokenIdIndex(), 0);
  });

  specify("Multipart contract initialization", async () => {
    const shareContract = await SHARE.deployed();
    const splitContract = await SL2RD.new();
    const operatorRegistry = await OperatorRegistry.deployed();
    const ownerAddresses = Array(10).fill(accounts[0]);
    const uniformCollaboratorsIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    await splitContract.multipartInitializationBegin(
      0 /* communitySplitsBasisPoints_ */,
      shareContract.address /* shareContractAddress_ */,
      operatorRegistry.address /* operatorRegistryAddress_ */
    );
    await splitContract.multipartAddPartition(
      0 /* partitionIndex_ */,
      ownerAddresses.slice(0, 5) /* addresses_ */,
      uniformCollaboratorsIds.slice(0, 5) /* tokenIds_ */
    );
    await splitContract.multipartAddPartition(
      1 /* partitionIndex_ */,
      ownerAddresses.slice(5, 10) /* addresses_ */,
      uniformCollaboratorsIds.slice(5, 10) /* tokenIds_ */
    );
    await splitContract.multipartInitializationEnd();
    assert.equal(accounts[DEFAULT_ADDRESS_INDEX], await splitContract.owner());
    assert.equal(await splitContract.tokenIdIndex(), 0);
  });

  specify("Contract initialization with 200 splits", async () => {
    const shareContract = await SHARE.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    const splitContract = await SL2RD.new();
    const uniformCollaboratorsIds = [];
    const ownerAddresses = [];

    for (let i = 0; i < 200; i += 1) {
      uniformCollaboratorsIds.push(Math.floor(Math.random() * 3));
      ownerAddresses.push(accounts[0]);
    }
    console.log(uniformCollaboratorsIds);
    try {
      await splitContract.initialize(
        ownerAddresses /* addresses_ */,
        uniformCollaboratorsIds /* tokenIds_ */,
        0 /* communitySplitsBasisPoints_ */,
        shareContract.address /* shareContractAddress_ */,
        operatorRegistry.address /* operatorRegistryAddress_ */
      );
    } catch (error) {
      console.log(error);
      console.log(error.message);
      assert(false, "Initialization with 200 splits failed");
    }
  });

  specify("Multipart contract initialization with 1000 splits", async () => {
    const shareContract = await SHARE.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    const splitContract = await SL2RD.new();
    const uniformCollaboratorsIds = [];
    const ownerAddresses = [];

    for (let i = 0; i < 1000; i += 1) {
      uniformCollaboratorsIds.push(Math.floor(Math.random() * 3));
      ownerAddresses.push(accounts[0]);
    }
    console.log(uniformCollaboratorsIds);
    try {
      await splitContract.multipartInitializationBegin(
        0 /* communitySplitsBasisPoints_ */,
        shareContract.address /* shareContractAddress_ */,
        operatorRegistry.address /* operatorRegistryAddress_ */
      );
      for (let partitionIndex = 0; partitionIndex < 10; partitionIndex += 1) {
        await splitContract.multipartAddPartition(
          partitionIndex /* partitionIndex_ */,
          ownerAddresses.slice(
            calculateSplitIndexUsingPartition(
              partitionIndex,
              MAX_SL2RD_PARTITION_SIZE,
              0
            ),
            calculateSplitIndexUsingPartition(
              partitionIndex,
              MAX_SL2RD_PARTITION_SIZE,
              MAX_SL2RD_PARTITION_SIZE
            )
          ) /* addresses_ */,
          uniformCollaboratorsIds.slice(
            calculateSplitIndexUsingPartition(
              partitionIndex,
              MAX_SL2RD_PARTITION_SIZE,
              0
            ),
            calculateSplitIndexUsingPartition(
              partitionIndex,
              MAX_SL2RD_PARTITION_SIZE,
              MAX_SL2RD_PARTITION_SIZE
            )
          ) /* tokenIds_ */
        );
      }
      await splitContract.multipartInitializationEnd();
    } catch (error) {
      console.log(error);
      console.log(error.message);
      assert(false, "Initialization with 1000 splits failed");
    }
  });

  specify("Multipart contract initialization with 10000 splits", async () => {
    const shareContract = await SHARE.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    const splitContract = await SL2RD.new();
    const uniformCollaboratorsIds = [];
    const ownerAddresses = [];

    for (let i = 0; i < 10000; i += 1) {
      uniformCollaboratorsIds.push(Math.floor(Math.random() * 3));
      ownerAddresses.push(accounts[0]);
    }
    console.log(uniformCollaboratorsIds);
    try {
      await splitContract.multipartInitializationBegin(
        0 /* communitySplitsBasisPoints_ */,
        shareContract.address /* shareContractAddress_ */,
        operatorRegistry.address /* operatorRegistryAddress_ */
      );
      for (let partitionIndex = 0; partitionIndex < 100; partitionIndex += 1) {
        await splitContract.multipartAddPartition(
          partitionIndex /* partitionIndex_ */,
          ownerAddresses.slice(
            calculateSplitIndexUsingPartition(
              partitionIndex,
              MAX_SL2RD_PARTITION_SIZE,
              0
            ),
            calculateSplitIndexUsingPartition(
              partitionIndex,
              MAX_SL2RD_PARTITION_SIZE,
              MAX_SL2RD_PARTITION_SIZE
            )
          ) /* addresses_ */,
          uniformCollaboratorsIds.slice(
            calculateSplitIndexUsingPartition(
              partitionIndex,
              MAX_SL2RD_PARTITION_SIZE,
              0
            ),
            calculateSplitIndexUsingPartition(
              partitionIndex,
              MAX_SL2RD_PARTITION_SIZE,
              MAX_SL2RD_PARTITION_SIZE
            )
          ) /* tokenIds_ */
        );
      }
      await splitContract.multipartInitializationEnd();
      const distributionTable = await splitContract.splitDistributionTable();
      assert(distributionTable.length === 10000);
    } catch (error) {
      console.log(error);
      console.log(error.message);
      assert(false, "Initialization with 10000 splits failed");
    }
  });

  specify(
    "Retrieve communitySplitBasisPoints, initialSplitDistributionTable, currentDistributionTable, totalSlots, totalCommunitySlots, nextAvailableCommunitySlot using getter functions.",
    async () => {
      const shareContract = await SHARE.deployed();
      const splitContract = await SL2RD.new();
      const operatorRegistry = await OperatorRegistry.deployed();
      const ownerAddresses = Array(10).fill(accounts[0]);
      const communitySplitsBasisPoints = 5000;

      const uniformCollaboratorsIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      await splitContract.initialize(
        ownerAddresses /* addresses_ */,
        uniformCollaboratorsIds /* tokenIds_ */,
        communitySplitsBasisPoints /* communitySplitsBasisPoints_ */,
        shareContract.address /* shareContractAddress_ */,
        operatorRegistry.address /* operatorRegistryAddress_ */
      );

      assert.equal(
        await splitContract.communitySplitsBasisPoints(),
        communitySplitsBasisPoints
      );

      assert.equal(
        (await splitContract.initialSplitDistributionTable()).length,
        ownerAddresses.length
      );

      for (let i = 0; i < ownerAddresses.length; i++) {
        assert.equal(
          (await splitContract.initialSplitDistributionTable())[i],
          ownerAddresses[i]
        );
      }

      assert.equal(
        await splitContract.totalSlots(),
        uniformCollaboratorsIds.length
      );

      assert.equal(
        await splitContract.totalCommunitySlots(),
        (communitySplitsBasisPoints * ownerAddresses.length) / 10000
      );

      // Distribution helper function test
      assert.equal(await splitContract.countAllocatedCommunitySlots(), 0);

      // Increment the current count of community slots.
      await splitContract.transferNextAvailable(
        accounts[NON_OWNER_ADDRESS_INDEX]
      );

      // Ensure the counter retrieves the correct count.
      assert.equal(await splitContract.countAllocatedCommunitySlots(), 1);

      const expectedNewDistribution = [
        accounts[NON_OWNER_ADDRESS_INDEX],
        accounts[DEFAULT_ADDRESS_INDEX],
        accounts[DEFAULT_ADDRESS_INDEX],
        accounts[DEFAULT_ADDRESS_INDEX],
        accounts[DEFAULT_ADDRESS_INDEX],
        accounts[DEFAULT_ADDRESS_INDEX],
        accounts[DEFAULT_ADDRESS_INDEX],
        accounts[DEFAULT_ADDRESS_INDEX],
        accounts[DEFAULT_ADDRESS_INDEX],
        accounts[DEFAULT_ADDRESS_INDEX],
      ];

      const newDistribution = await splitContract.splitDistributionTable();

      for (let i = 0; i < ownerAddresses.length; i++) {
        assert.equal(newDistribution[i], expectedNewDistribution[i]);
      }
    }
  );

  specify(
    "Return the correct transfer timestamp for each token ID",
    async () => {
      const shareContract = await SHARE.deployed();
      const splitContract = await SL2RD.new();
      const operatorRegistry = await OperatorRegistry.deployed();
      const ownerAddresses = Array(10).fill(accounts[0]);
      const receiptAddress = accounts[NON_OWNER_ADDRESS_INDEX];
      const uniformCollaboratorsIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const negligibleTimeDifference = 1;

      await splitContract.initialize(
        ownerAddresses /* addresses_ */,
        uniformCollaboratorsIds /* tokenIds_ */,
        0 /* communitySplitsBasisPoints_ */,
        shareContract.address /* shareContractAddress_ */,
        operatorRegistry.address /* operatorRegistryAddress_ */
      );

      /* ------- slotTransferTimestamps() test -------*/

      // Record the current block timestamp before sending payment transactions
      const recordedTimestamps = [];
      for (let i = 0; i < ownerAddresses.length; i++) {
        const block = await web3.eth.getBlock("latest");
        recordedTimestamps.push(block.timestamp);
        await splitContract.transferFrom(
          ownerAddresses[0],
          receiptAddress,
          i, // tokenId
          { from: ownerAddresses[0] }
        );
      }

      // Fetch the transfer timestamps for each tokenId
      const transferTimestamps = await splitContract.slotTransferTimestamps();

      // Assert that each transfer timestamp matches the recorded timestamp
      for (let i = 0; i < ownerAddresses.length; i++) {
        assert(
          Math.abs(transferTimestamps[i].toNumber() - recordedTimestamps[i]) <=
            negligibleTimeDifference,
          `Invalid transfer timestamp for tokenId ${i}`
        );
      }

      /* ------- slotTransferTimestamp(tokenId) test -------*/

      // Assert that the transfer timestamp matches the recorded timestamp
      assert(
        Math.abs(
          (await splitContract.slotTransferTimestamp(0)).toNumber() -
            recordedTimestamps[0]
        ) <= negligibleTimeDifference,
        "Incorrect timestamp for tokenId 0."
      );
    }
  );

  specify("Payable with rotating recipient", async () => {
    const NUM_TRANSACTIONS = 50;
    const shareContract = await SHARE.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    const splitContract = await SL2RD.new();
    const ownerAddresses = Array(10).fill(accounts[0]);

    const uniformCollaboratorsIds = [0, 1, 0, 0, 0, 2, 0, 0, 0, 0];
    const uniformCollaborators = [
      accounts[0],
      accounts[1] /* tokenId 0 */,
      accounts[2] /* tokenId 1 */,
      accounts[3] /* tokenId 2 */,
    ];

    try {
      await splitContract.initialize(
        ownerAddresses /* addresses_ */,
        uniformCollaboratorsIds /* tokenIds_ */,
        0 /* communitySplitsBasisPoints_ */,
        shareContract.address /* shareContractAddress_ */,
        operatorRegistry.address /* operatorRegistryAddress_ */
      );
    } catch (error) {
      console.log(error);
      console.log(error.message);
      assert(false, "Initialization failed");
    }
    const uniformCollaboratorsMap = new Map([
      [0, uniformCollaborators[1]],
      [1, uniformCollaborators[2]],
      [2, uniformCollaborators[3]],
    ]);

    await splitContract.safeTransferFrom(accounts[0], accounts[1], 0);
    await splitContract.transferFrom(accounts[0], accounts[2], 1);
    await splitContract.safeTransferFrom(accounts[0], accounts[3], 2);

    for (let i = 0; i < NUM_TRANSACTIONS; i += 1) {
      await web3.eth
        .sendTransaction({
          to: splitContract.address,
          from: accounts[DEFAULT_ADDRESS_INDEX],
          value: 1,
        })
        .then(function (receipt) {
          console.log(receipt);
          splitContract
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
                  uniformCollaboratorsMap.get(
                    uniformCollaboratorsIds[i % uniformCollaboratorsIds.length]
                  )
                )
              );
              assert.equal(mostRecentEvent.returnValues.value, 1);
            });
        });
    }
  });

  specify("Sending slots to non-EOA Failure", async () => {
    const smartContractPFA = await PFAUnit.deployed();
    const shareContract = await SHARE.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    const splitContract = await SL2RD.new();
    const ownerAddresses = Array(10).fill(accounts[0]);

    const uniformCollaboratorsIds = [0, 1, 0, 0, 0, 2, 0, 0, 0, 0];

    try {
      await splitContract.initialize(
        ownerAddresses /* addresses_ */,
        uniformCollaboratorsIds /* tokenIds_ */,
        0 /* communitySplitsBasisPoints_ */,
        shareContract.address /* shareContractAddress_ */,
        operatorRegistry.address /* operatorRegistryAddress_ */
      );
    } catch (error) {
      console.log(error);
      console.log(error.message);
      assert(false, "Initialization failed");
    }

    try {
      await splitContract.safeTransferFrom(accounts[0], accounts[1], 0);
      assert(true, "Transfer to EOA");
    } catch (error) {
      assert(error.message.includes("SHARE007"));
    }

    try {
      await splitContract.transferFrom(
        accounts[0],
        smartContractPFA.address,
        1
      );
    } catch (error) {
      console.log(error.message);
      assert(error.message.includes("SHARE007"));
    }

    try {
      await splitContract.safeTransferFrom(
        accounts[0],
        smartContractPFA.address,
        2
      );
    } catch (error) {
      console.log(error.message);
      assert(error.message.includes("SHARE007"));
    }
  });

  specify("SL2RD owner can reclaim PFA", async () => {
    const shareContract = await SHARE.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    await shareContract.setCodeVerificationEnabled(false);
    const split = await SL2RD.new();
    const pfa = await PFAUnit.new();
    const ownerAddresses = [accounts[0], accounts[0], accounts[0]];

    const uniformCollaboratorsIds = [0, 1, 2];

    await pfa.initialize(
      "/test/token/uri" /* tokenURI_ */,
      "1000000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      false /* supportsLicensing_ */,
      0 /* pricePerLicense_ */,
      shareContract.address /* shareContractAddress_ */
    );
    await split.initialize(
      ownerAddresses /* addresses_ */,
      uniformCollaboratorsIds /* tokenIds_ */,
      0 /* communitySplitsBasisPoints_ */,
      shareContract.address /* shareContractAddress_ */,
      operatorRegistry.address /* operatorRegistryAddress_ */
    );
    await pfa.transferOwnership(split.address);
    assert.equal(split.address, await pfa.owner());
    await split.reclaim(pfa.address, {
      from: accounts[DEFAULT_ADDRESS_INDEX],
    });
    assert.equal(accounts[DEFAULT_ADDRESS_INDEX], await pfa.owner());
  });

  specify("Only SL2RD owner can reclaim PFA", async () => {
    const shareContract = await SHARE.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    await shareContract.setCodeVerificationEnabled(false);

    const ownerAddresses = [accounts[0], accounts[0], accounts[0]];
    const split = await SL2RD.new();
    const pfa = await PFAUnit.new();
    const uniformCollaboratorsIds = [0, 1, 2];

    await pfa.initialize(
      "/test/token/uri" /* tokenURI_ */,
      "1000000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      false /* supportsLicensing_ */,
      0 /* pricePerLicense_ */,
      shareContract.address /* shareContractAddress_ */
    );
    await split.initialize(
      ownerAddresses /* addresses_ */,
      uniformCollaboratorsIds /* tokenIds_ */,
      0 /* communitySplitsBasisPoints_ */,
      shareContract.address /* shareContractAddress_ */,
      operatorRegistry.address /* operatorRegistryAddress_ */
    );
    await pfa.transferOwnership(split.address);
    assert.equal(split.address, await pfa.owner());
    try {
      await split.reclaim(pfa.address, {
        from: accounts[NON_OWNER_ADDRESS_INDEX],
      });
    } catch (error) {
      console.log(error.message);
      assert(error.message.includes("caller is not the owner"));
    }
  });

  /* If using Ganache, be sure to set account amount adequately */
  specify("Comprehensive test", async () => {
    const NUM_TRANSACTIONS = 50;
    const SIZE = 20;
    const shareContract = await SHARE.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    const splitContract = await SL2RD.new();
    const uniformCollaboratorsIds = [];
    const ownerAddresses = [];
    const uniformCollaborators = [];

    for (let i = 0; i < SIZE; i += 1) {
      uniformCollaboratorsIds.push(i);
      ownerAddresses.push(accounts[0]);
      uniformCollaborators.push(accounts[i + 1]);
    }

    console.log("ACCOUNTS", uniformCollaborators);

    try {
      await splitContract.initialize(
        ownerAddresses /* addresses_ */,
        uniformCollaboratorsIds /* tokenIds_ */,
        0 /* communitySplitsBasisPoints_ */,
        shareContract.address /* shareContractAddress_ */,
        operatorRegistry.address /* operatorRegistryAddress_ */
      );
    } catch (error) {
      console.log(error);
      console.log(error.message);
      assert(false, "Initialization failed");
    }

    const uniformCollaboratorsMap = new Map();
    for (let i = 0; i < SIZE; i += 1) {
      uniformCollaboratorsMap.set(i, uniformCollaborators[i]);
    }

    console.log("FULL MAP: ", uniformCollaboratorsMap);

    const entries = Array.from(uniformCollaboratorsMap.entries());
    const halfLength = Math.ceil(entries.length / 2);

    for (let i = 0; i < entries.length; i += 1) {
      const tokenId = entries[i][0];
      const recipient = entries[i][1];

      console.log("tokenId: ", tokenId, "\n");

      if (i < halfLength) {
        await splitContract.safeTransferFrom(accounts[0], recipient, tokenId);
      } else {
        await splitContract.transferFrom(accounts[0], recipient, tokenId);
      }
    }

    for (let i = 0; i < NUM_TRANSACTIONS; i += 1) {
      await web3.eth
        .sendTransaction({
          to: splitContract.address,
          from: accounts[DEFAULT_ADDRESS_INDEX],
          value: 1,
        })
        .then(function (receipt) {
          console.log(receipt);
          splitContract
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
                  uniformCollaboratorsMap.get(
                    uniformCollaboratorsIds[i % uniformCollaboratorsIds.length]
                  )
                )
              );
              assert.equal(mostRecentEvent.returnValues.value, 1);
            });
        });
    }
  });

  /* If using Ganache, be sure to set account amount adequately */
  specify("Multipart split comprehensive test", async () => {
    const NUM_TRANSACTIONS = 50;
    const SIZE = 20;
    const shareContract = await SHARE.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    const splitContract = await SL2RD.new();
    const uniformCollaboratorsIds = [];
    const ownerAddresses = [];
    const uniformCollaborators = [];

    for (let i = 0; i < SIZE; i += 1) {
      uniformCollaboratorsIds.push(i);
      ownerAddresses.push(accounts[0]);
      uniformCollaborators.push(accounts[i + 1]);
    }
    console.log("ACCOUNTS", uniformCollaborators);
    try {
      await splitContract.multipartInitializationBegin(
        0 /* communitySplitsBasisPoints_ */,
        shareContract.address /* shareContractAddress_ */,
        operatorRegistry.address /* operatorRegistryAddress_ */
      );
      for (let partitionIndex = 0; partitionIndex < 5; partitionIndex += 1) {
        await splitContract.multipartAddPartition(
          partitionIndex /* partitionIndex_ */,
          ownerAddresses.slice(
            calculateSplitIndexUsingPartition(partitionIndex, 4, 0),
            calculateSplitIndexUsingPartition(partitionIndex, 4, 4)
          ) /* addresses_ */,
          uniformCollaboratorsIds.slice(
            calculateSplitIndexUsingPartition(partitionIndex, 4, 0),
            calculateSplitIndexUsingPartition(partitionIndex, 4, 4)
          ) /* tokenIds_ */
        );
      }
      await splitContract.multipartInitializationEnd();
    } catch (error) {
      console.log(error);
      console.log(error.message);
      assert(false, "Initialization failed");
    }

    const uniformCollaboratorsMap = new Map();
    for (let i = 0; i < SIZE; i += 1) {
      uniformCollaboratorsMap.set(i, uniformCollaborators[i]);
    }

    console.log("FULL MAP: ", uniformCollaboratorsMap);

    const entries = Array.from(uniformCollaboratorsMap.entries());
    const halfLength = Math.ceil(entries.length / 2);

    for (let i = 0; i < entries.length; i += 1) {
      const tokenId = entries[i][0];
      const recipient = entries[i][1];

      console.log("tokenId: ", tokenId, "\n");

      if (i < halfLength) {
        await splitContract.safeTransferFrom(accounts[0], recipient, tokenId);
      } else {
        await splitContract.transferFrom(accounts[0], recipient, tokenId);
      }
    }

    for (let i = 0; i < NUM_TRANSACTIONS; i += 1) {
      await web3.eth
        .sendTransaction({
          to: splitContract.address,
          from: accounts[DEFAULT_ADDRESS_INDEX],
          value: 1,
        })
        .then(function (receipt) {
          console.log(receipt);
          splitContract
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
                  uniformCollaboratorsMap.get(
                    uniformCollaboratorsIds[i % uniformCollaboratorsIds.length]
                  )
                )
              );
              assert.equal(mostRecentEvent.returnValues.value, 1);
            });
        });
    }
  });

  specify("Transfer next available slot to a specified address", async () => {
    const shareContract = await SHARE.deployed();
    const splitContract = await SL2RD.new();
    const operatorRegistry = await OperatorRegistry.deployed();
    const ownerAddresses = Array(10).fill(accounts[0]);
    const recipientAddress = accounts[NON_OWNER_ADDRESS_INDEX];
    const uniformCollaboratorsIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const communitySplitsBasisPoints = 4000;

    await splitContract.initialize(
      ownerAddresses /* addresses_ */,
      uniformCollaboratorsIds /* tokenIds_ */,
      communitySplitsBasisPoints /* communitySplitsBasisPoints_ */,
      shareContract.address /* shareContractAddress_ */,
      operatorRegistry.address /* operatorRegistryAddress_ */
    );

    // Transfer the reserved community allocation (first 4 slots) to community
    for (let i = 0; i < 4; i++) {
      await splitContract.transferNextAvailable(recipientAddress, {
        from: ownerAddresses[0],
      });

      assert.equal(recipientAddress, await splitContract.ownerOf(i));
    }

    // Make sure the owner still owns the private allocation
    for (let i = 4; i < ownerAddresses.length; i++) {
      assert.equal(
        ownerAddresses[0],
        await splitContract.ownerOf(i),
        "Distributed past community allocation."
      );
    }
  });

  specify(
    "Multipart split transfer next available slot to a specified address",
    async () => {
      const shareContract = await SHARE.deployed();
      const splitContract = await SL2RD.new();
      const operatorRegistry = await OperatorRegistry.deployed();
      const ownerAddresses = Array(10).fill(accounts[0]);
      const recipientAddress = accounts[NON_OWNER_ADDRESS_INDEX];
      const uniformCollaboratorsIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const communitySplitsBasisPoints = 4000;

      await splitContract.multipartInitializationBegin(
        communitySplitsBasisPoints /* communitySplitsBasisPoints_ */,
        shareContract.address /* shareContractAddress_ */,
        operatorRegistry.address /* operatorRegistryAddress_ */
      );
      for (let partitionIndex = 0; partitionIndex < 5; partitionIndex += 1) {
        await splitContract.multipartAddPartition(
          partitionIndex /* partitionIndex_ */,
          ownerAddresses.slice(
            calculateSplitIndexUsingPartition(partitionIndex, 2, 0),
            calculateSplitIndexUsingPartition(partitionIndex, 2, 2)
          ) /* addresses_ */,
          uniformCollaboratorsIds.slice(
            calculateSplitIndexUsingPartition(partitionIndex, 2, 0),
            calculateSplitIndexUsingPartition(partitionIndex, 2, 2)
          ) /* tokenIds_ */
        );
      }
      await splitContract.multipartInitializationEnd();

      // Transfer the reserved community allocation (first 4 slots) to community
      for (let i = 0; i < 4; i++) {
        await splitContract.transferNextAvailable(recipientAddress, {
          from: ownerAddresses[0],
        });
        assert.equal(recipientAddress, await splitContract.ownerOf(i));
      }

      // Make sure the owner still owns the private allocation
      for (let i = 4; i < ownerAddresses.length; i++) {
        assert.equal(
          ownerAddresses[0],
          await splitContract.ownerOf(i),
          "Distributed past community allocation."
        );
      }
    }
  );

  specify(
    "Multipart allocate multiple available slots to a specified address",
    async () => {
      const shareContract = await SHARE.deployed();
      const splitContract = await SL2RD.new();
      const operatorRegistry = await OperatorRegistry.deployed();
      const ownerAddresses = Array(10).fill(accounts[0]);
      const recipientAddress = accounts[NON_OWNER_ADDRESS_INDEX];
      const uniformCollaboratorsIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const communitySplitsBasisPoints = 10000;

      await splitContract.multipartInitializationBegin(
        communitySplitsBasisPoints /* communitySplitsBasisPoints_ */,
        shareContract.address /* shareContractAddress_ */,
        operatorRegistry.address /* operatorRegistryAddress_ */
      );
      for (let partitionIndex = 0; partitionIndex < 5; partitionIndex += 1) {
        await splitContract.multipartAddPartition(
          partitionIndex /* partitionIndex_ */,
          ownerAddresses.slice(
            calculateSplitIndexUsingPartition(partitionIndex, 2, 0),
            calculateSplitIndexUsingPartition(partitionIndex, 2, 2)
          ) /* addresses_ */,
          uniformCollaboratorsIds.slice(
            calculateSplitIndexUsingPartition(partitionIndex, 2, 0),
            calculateSplitIndexUsingPartition(partitionIndex, 2, 2)
          ) /* tokenIds_ */
        );
      }
      await splitContract.multipartInitializationEnd();

      await splitContract.transferMultipleAvailable(recipientAddress, 7, {
        from: ownerAddresses[0],
      });

      for (let i = 0; i < 7; i++) {
        assert.equal(recipientAddress, await splitContract.ownerOf(i));
      }

      // Make sure the owner still owns the private allocation
      for (let i = 7; i < ownerAddresses.length; i++) {
        assert.equal(
          ownerAddresses[0],
          await splitContract.ownerOf(i),
          "Distributed past community allocation."
        );
      }
    }
  );

  specify("Transfer slot past community allocation failure", async () => {
    const shareContract = await SHARE.deployed();
    const splitContract = await SL2RD.new();
    const operatorRegistry = await OperatorRegistry.deployed();
    const ownerAddresses = Array(10).fill(accounts[0]);
    const recipientAddress = accounts[NON_OWNER_ADDRESS_INDEX];
    const uniformCollaboratorsIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const communitySplitsBasisPoints = 4000;

    await splitContract.initialize(
      ownerAddresses /* addresses_ */,
      uniformCollaboratorsIds /* tokenIds_ */,
      communitySplitsBasisPoints /* communitySplitsBasisPoints_ */,
      shareContract.address /* shareContractAddress_ */,
      operatorRegistry.address /* operatorRegistryAddress_ */
    );

    // Transfer the reserved community allocation (first 4 slots) to community
    for (let i = 0; i < 4; i++) {
      await splitContract.transferNextAvailable(recipientAddress, {
        from: ownerAddresses[0],
      });

      assert.equal(recipientAddress, await splitContract.ownerOf(i));
    }

    // Transfer past the community allocation.
    try {
      await splitContract.transferNextAvailable(recipientAddress, {
        from: ownerAddresses[0],
      });
      assert(error.message.includes("SHARE035"));
    } catch (error) {
      console.log(error.message);
    }
  });

  specify("Transfer slot in community allocation failure", async () => {
    const shareContract = await SHARE.deployed();
    const splitContract = await SL2RD.new();
    const operatorRegistry = await OperatorRegistry.deployed();
    const ownerAddresses = Array(10).fill(accounts[0]);
    const recipientAddress = accounts[NON_OWNER_ADDRESS_INDEX];
    const uniformCollaboratorsIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const communitySplitsBasisPoints = 4000;

    await splitContract.initialize(
      ownerAddresses /* addresses_ */,
      uniformCollaboratorsIds /* tokenIds_ */,
      communitySplitsBasisPoints /* communitySplitsBasisPoints_ */,
      shareContract.address /* shareContractAddress_ */,
      operatorRegistry.address /* operatorRegistryAddress_ */
    );

    // Transfer one of the community slots to non-owner address, before distribution.
    try {
      await splitContract.transferFrom(ownerAddresses[0], recipientAddress, 1);
      assert(error.message.includes("SHARE037"));
    } catch (error) {
      console.log(error.message);
    }
  });

  specify(
    "Initialize operator registry and use non-registry address to conduct transfer error.",
    async () => {
      const shareContract = await SHARE.deployed();
      const splitContract = await SL2RD.new();
      const operatorRegistry = await OperatorRegistry.deployed();
      const ownerAddresses = Array(10).fill(accounts[0]);
      const recipientAddress = accounts[NON_OWNER_ADDRESS_INDEX];
      const uniformCollaboratorsIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const operatorAddresses = [accounts[5], accounts[6]];
      const nonOperatorAddress = accounts[7];
      const communitySplitsBasisPoints = 4000;

      await operatorRegistry.initialize(operatorAddresses);

      await splitContract.initialize(
        ownerAddresses /* addresses_ */,
        uniformCollaboratorsIds /* tokenIds_ */,
        communitySplitsBasisPoints /* communitySplitsBasisPoints_ */,
        shareContract.address /* shareContractAddress_ */,
        operatorRegistry.address /* operatorRegistryAddress_ */
      );

      // Try and initiate distribution with non-operator && non-owner address
      try {
        await splitContract.transferNextAvailable(recipientAddress, {
          from: nonOperatorAddress,
        });
        assert(error.message.includes("SHARE030"));
      } catch (error) {
        console.log(error.message);
      }
    }
  );

  specify(
    "Initialize operator registry and use verified operator address to conduct transfer.",
    async () => {
      const shareContract = await SHARE.deployed();
      const splitContract = await SL2RD.new();
      const operatorRegistry = await OperatorRegistry.deployed();
      const ownerAddresses = Array(10).fill(accounts[0]);
      const recipientAddress = accounts[NON_OWNER_ADDRESS_INDEX];
      const uniformCollaboratorsIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const operatorAddresses = [accounts[5], accounts[6]];
      const communitySplitsBasisPoints = 4000;

      await operatorRegistry.initialize(operatorAddresses);

      await splitContract.initialize(
        ownerAddresses /* addresses_ */,
        uniformCollaboratorsIds /* tokenIds_ */,
        communitySplitsBasisPoints /* communitySplitsBasisPoints_ */,
        shareContract.address /* shareContractAddress_ */,
        operatorRegistry.address /* operatorRegistryAddress_ */
      );

      assert(
        await splitContract.transferNextAvailable(recipientAddress, {
          from: operatorAddresses[0],
        }),
        "Non-operator trying to initiate community distribution process."
      );
    }
  );

  specify("Owner can set ERC20 contract address", async () => {
    // Set ERC20 contract address
    await this._singletonSplitContract.setERC20ContractAddress(
      mockERC20Address,
      {
        from: accounts[DEFAULT_ADDRESS_INDEX],
      }
    );

    // Verify the ERC20 contract address
    const result = await this._singletonSplitContract.getERC20ContractAddress();
    assert.equal(
      normalizeAddress(result),
      normalizeAddress(mockERC20Address),
      "The ERC20 contract address was not set correctly."
    );
  });

  specify("Non-owner cannot set ERC20 contract address", async () => {
    try {
      // Attempt to set ERC20 contract address by a non-owner
      await this._singletonSplitContract.setERC20ContractAddress(
        mockERC20Address,
        {
          from: accounts[NON_OWNER_ADDRESS_INDEX],
        }
      );
      assert.fail("Expected revert, but transaction succeeded.");
    } catch (error) {
      assert(
        error.message.includes("caller is not the owner"),
        "Expected revert with 'caller is not the owner', but got: " +
          error.message
      );
    }
  });

  specify("getERC20ContractAddress returns the correct value", async () => {
    // Set the ERC20 contract address
    await this._singletonSplitContract.setERC20ContractAddress(
      mockERC20Address,
      {
        from: accounts[DEFAULT_ADDRESS_INDEX],
      }
    );

    // Verify the getter returns the correct address
    const erc20Address =
      await this._singletonSplitContract.getERC20ContractAddress();
    assert.equal(
      erc20Address.toLowerCase(),
      mockERC20Address.toLowerCase(),
      "getERC20ContractAddress did not return the correct address."
    );
  });

  specify("Payable with rotating recipient and batch payments", async () => {
    const NUM_TRANSACTIONS = 50;
    const BATCH_SIZE = 4;
    const PAYMENT_VALUE = web3.utils.toWei("0.001", "ether");
    const shareContract = await SHARE.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    const splitContract = await SL2RD.new();
    const ownerAddresses = Array(10).fill(accounts[0]);

    const uniformCollaboratorsIds = [0, 1, 0, 0, 0, 2, 0, 0, 0, 0];
    const uniformCollaborators = [
      accounts[0],
      accounts[1] /* tokenId 0 */,
      accounts[2] /* tokenId 1 */,
      accounts[3] /* tokenId 2 */,
    ];

    try {
      await splitContract.initialize(
        ownerAddresses /* addresses_ */,
        uniformCollaboratorsIds /* tokenIds_ */,
        0 /* communitySplitsBasisPoints_ */,
        shareContract.address /* shareContractAddress_ */,
        operatorRegistry.address /* operatorRegistryAddress_ */
      );
    } catch (error) {
      console.log(error);
      console.log(error.message);
      assert(false, "Initialization failed");
    }
    const uniformCollaboratorsMap = new Map([
      [0, uniformCollaborators[1]],
      [1, uniformCollaborators[2]],
      [2, uniformCollaborators[3]],
    ]);

    await splitContract.safeTransferFrom(accounts[0], accounts[1], 0);
    await splitContract.transferFrom(accounts[0], accounts[2], 1);
    await splitContract.safeTransferFrom(accounts[0], accounts[3], 2);

    // Set batch size
    await splitContract.setPaymentBatchSize(BATCH_SIZE);

    for (let i = 0; i < NUM_TRANSACTIONS; i += 1) {
      await web3.eth
        .sendTransaction({
          to: splitContract.address,
          from: accounts[DEFAULT_ADDRESS_INDEX],
          value: PAYMENT_VALUE,
          gas: 200000,
        })
        .then(function (receipt) {
          console.log(receipt);
          splitContract
            .getPastEvents("Payment", {
              fromBlock: 0,
              toBlock: "latest",
            })
            .then((events) => {
              assert.equal(events.length, (i + 1) * BATCH_SIZE);
              for (let j = 0; j < BATCH_SIZE; j++) {
                const event = events[events.length - BATCH_SIZE + j];
                const expectedTokenId =
                  uniformCollaboratorsIds[
                    (i * BATCH_SIZE + j) % uniformCollaboratorsIds.length
                  ];
                assert.equal(
                  normalizeAddress(event.returnValues.recipient.toLowerCase()),
                  normalizeAddress(uniformCollaboratorsMap.get(expectedTokenId))
                );
                console.log(event.returnValues.value);
                assert.equal(
                  event.returnValues.value,
                  PAYMENT_VALUE / BATCH_SIZE, // Each recipient gets an equal share
                  "Incorrect payment value"
                );
              }
            });
        });
    }
  });
});
