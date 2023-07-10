const SHARE = artifacts.require("SHARE");
const SL2RD = artifacts.require("SL2RD");
const PFAUnit = artifacts.require("PFAUnit");
const DEFAULT_ADDRESS_INDEX = 0;
const NON_OWNER_ADDRESS_INDEX = 1;

function normalizeAddress(address) {
  return address.toLowerCase();
}

contract("SL2RD", (accounts) => {
  specify("Contract initialization", async () => {
    const shareContract = await SHARE.deployed();
    const splitContract = await SL2RD.deployed();
    const ownerAddresses = Array(10).fill(accounts[0]);

    const uniformCollaboratorsIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    await splitContract.initialize(
      ownerAddresses /* addresses_ */,
      uniformCollaboratorsIds /* tokenIds_ */,
      shareContract.address /* shareContractAddress_ */
    );
    assert.equal(
      accounts[DEFAULT_ADDRESS_INDEX],
      await splitContract.owner()
    );
    assert.equal(await splitContract.tokenIdIndex(), 0);
  });

  specify("Contract initialization with 200 splits", async () => {
    const shareContract = await SHARE.deployed();
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
        shareContract.address /* shareContractAddress_ */
      );
    } catch (error) {
      console.log(error);
      console.log(error.message);
      assert(false, "Initialization with 200 splits failed");
    }
  });

  specify("Payable with rotating recipient", async () => {
    const NUM_TRANSACTIONS = 50;
    const shareContract = await SHARE.deployed();
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
        shareContract.address /* shareContractAddress_ */
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
    const splitContract = await SL2RD.new();
    const ownerAddresses = Array(10).fill(accounts[0]);

    const uniformCollaboratorsIds = [0, 1, 0, 0, 0, 2, 0, 0, 0, 0];

    try {
      await splitContract.initialize(
        ownerAddresses /* addresses_ */,
        uniformCollaboratorsIds /* tokenIds_ */,
        shareContract.address /* shareContractAddress_ */
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
      shareContract.address /* shareContractAddress_ */
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
      shareContract.address /* shareContractAddress_ */
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
        shareContract.address /* shareContractAddress_ */
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
});
