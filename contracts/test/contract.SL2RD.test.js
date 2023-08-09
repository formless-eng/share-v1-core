const SHARE = artifacts.require("SHARE");
const SL2RD = artifacts.require("SL2RD");
const PFAUnit = artifacts.require("PFAUnit");
const OperatorRegistry = artifacts.require("OperatorRegistry");
const DEFAULT_ADDRESS_INDEX = 0;
const NON_OWNER_ADDRESS_INDEX = 1;

function normalizeAddress(address) {
  return address.toLowerCase();
}

contract("SL2RD", (accounts) => {
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
    assert.equal(
      accounts[DEFAULT_ADDRESS_INDEX],
      await splitContract.owner()
    );
    assert.equal(await splitContract.tokenIdIndex(), 0);
  });

  specify("Contract initialization with 200 splits", async () => {
    const shareContract = await SHARE.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    const split = await SL2RD.new();
    const uniformCollaboratorsIds = [];
    const ownerAddresses = [];

    for (let i = 0; i < 200; i += 1) {
      uniformCollaboratorsIds.push(Math.floor(Math.random() * 3));
      ownerAddresses.push(accounts[0]);
    }
    console.log(uniformCollaboratorsIds);
    try {
      await split.initialize(
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
      assert.equal(
        await splitContract.countAllocatedCommunitySlots(),
        0
      );

      // Increment the current count of community slots.
      await splitContract.transferNextAvailable(
        accounts[NON_OWNER_ADDRESS_INDEX]
      );

      // Ensure the counter retrieves the correct count.
      assert.equal(
        await splitContract.countAllocatedCommunitySlots(),
        1
      );

      const newDistribution = [
        accounts[1],
        accounts[0],
        accounts[0],
        accounts[0],
        accounts[0],
        accounts[0],
        accounts[0],
        accounts[0],
        accounts[0],
        accounts[0],
      ];

      for (let i = 0; i < ownerAddresses.length; i++) {
        assert.equal(
          (await splitContract.currentSplitDistributionTable())[i],
          newDistribution[i]
        );
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
      const transferTimestamps =
        await splitContract.slotTransferTimestamps();

      // Assert that each transfer timestamp matches the recorded timestamp
      for (let i = 0; i < ownerAddresses.length; i++) {
        assert(
          Math.abs(
            transferTimestamps[i].toNumber() - recordedTimestamps[i]
          ) <= negligibleTimeDifference,
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
                    uniformCollaboratorsIds[
                      i % uniformCollaboratorsIds.length
                    ]
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
      await splitContract.safeTransferFrom(
        accounts[0],
        accounts[1],
        0
      );
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
        await splitContract.safeTransferFrom(
          accounts[0],
          recipient,
          tokenId
        );
      } else {
        await splitContract.transferFrom(
          accounts[0],
          recipient,
          tokenId
        );
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
                    uniformCollaboratorsIds[
                      i % uniformCollaboratorsIds.length
                    ]
                  )
                )
              );
              assert.equal(mostRecentEvent.returnValues.value, 1);
            });
        });
    }
  });

  specify(
    "Transfer next available slot to a specified address",
    async () => {
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

        assert.equal(
          recipientAddress,
          await splitContract.ownerOf(i)
        );
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
    "Transfer slot past community allocation failure",
    async () => {
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

        assert.equal(
          recipientAddress,
          await splitContract.ownerOf(i)
        );
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
    }
  );

  specify(
    "Transfer slot in community allocation failure",
    async () => {
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
        await splitContract.transferFrom(
          ownerAddresses[0],
          recipientAddress,
          1
        );
        assert(error.message.includes("SHARE037"));
      } catch (error) {
        console.log(error.message);
      }
    }
  );

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

      assert(
        await splitContract.transferNextAvailable(recipientAddress, {
          from: operatorAddresses[0],
        }),
        "Non-operator trying to initiate community distribution process."
      );
    }
  );
});
