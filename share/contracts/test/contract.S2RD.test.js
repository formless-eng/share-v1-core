const SHARE = artifacts.require("SHARE");
const S2RD = artifacts.require("S2RD");
const PFAUnit = artifacts.require("PFAUnit");
const DEFAULT_ADDRESS_INDEX = 0;
const NON_OWNER_ADDRESS_INDEX = 1;

function normalizeAddress(address) {
  return address.toLowerCase();
}

contract("S2RD", (accounts) => {
  specify("Contract initialization", async () => {
    const shareContract = await SHARE.deployed();
    const assetContract = await S2RD.deployed();
    const uniformCollaborators = [
      accounts[0],
      accounts[1],
      accounts[2],
      accounts[3],
      accounts[4],
      accounts[5],
      accounts[6],
      accounts[7],
      accounts[8],
      accounts[9],
    ];
    await assetContract.initialize(
      uniformCollaborators /* addresses_ */,
      shareContract.address /* shareContractAddress_ */
    );
    assert.equal(
      accounts[DEFAULT_ADDRESS_INDEX],
      await assetContract.owner()
    );

    assert.equal(await assetContract.addressIndex(), 0);
  });

  specify("Contract initialization with 200 splits", async () => {
    const shareContract = await SHARE.deployed();
    const split = await S2RD.new();
    let uniformCollaborators = [];
    for (let i = 0; i < 191; i += 1) {
      uniformCollaborators.push(
        accounts[Math.floor(Math.random() * 3)]
      );
    }
    try {
      await split.initialize(
        uniformCollaborators /* addresses_ */,
        shareContract.address /* shareContractAddress_ */
      );
    } catch (error) {
      console.log(error);
      console.log(error.message);
      assert(false, "Initialization with 200 splits failed");
    }
  });

  specify(
    "Contract initialization with splits greater than max",
    async () => {
      const shareContract = await SHARE.deployed();
      const split = await S2RD.new();
      const uniformCollaborators = [];
      for (let i = 0; i < 500; i += 1) {
        uniformCollaborators.push(
          accounts[Math.floor(Math.random() * 3)]
        );
      }
      try {
        await split.initialize(
          uniformCollaborators /* addresses_ */,
          shareContract.address /* shareContractAddress_ */
        );
        assert(false, "Expected initialization exception not thrown");
      } catch (error) {
        console.log(error.message);
        assert(error.message.includes("SHARE006"));
      }
    }
  );

  specify("Payable with rotating recipient", async () => {
    const NUM_TRANSACTIONS = 50;
    const assetContract = await S2RD.deployed();
    const uniformCollaborators = [
      accounts[0],
      accounts[1],
      accounts[2],
      accounts[3],
      accounts[4],
      accounts[5],
      accounts[6],
      accounts[7],
      accounts[8],
      accounts[9],
    ];

    for (let i = 0; i < NUM_TRANSACTIONS; i++) {
      await web3.eth
        .sendTransaction({
          to: assetContract.address,
          from: accounts[DEFAULT_ADDRESS_INDEX],
          value: 1,
        })
        .then(function (receipt) {
          console.log(receipt);
          assetContract
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
                  uniformCollaborators[
                    i % uniformCollaborators.length
                  ]
                )
              );
              assert.equal(mostRecentEvent.returnValues.value, 1);
            });
        });
    }
  });

  specify("S2RD owner can reclaim PFA", async () => {
    const shareContract = await SHARE.deployed();
    await shareContract.setCodeVerificationEnabled(false);
    const split = await S2RD.new();
    const pfa = await PFAUnit.new();
    const uniformCollaborators = [
      accounts[0],
      accounts[1],
      accounts[2],
    ];
    await pfa.initialize(
      "/test/token/uri" /* tokenURI_ */,
      "1000000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      false /* supportsLicensing_ */,
      0 /* pricePerLicense_ */,
      shareContract.address /* shareContractAddress_ */
    );
    await split.initialize(
      uniformCollaborators /* addresses_ */,
      shareContract.address /* shareContractAddress_ */
    );
    await pfa.transferOwnership(split.address);
    assert.equal(split.address, await pfa.owner());
    await split.reclaim(pfa.address, {
      from: accounts[DEFAULT_ADDRESS_INDEX],
    });
    assert.equal(accounts[DEFAULT_ADDRESS_INDEX], await pfa.owner());
  });

  specify("Only S2RD owner can reclaim PFA", async () => {
    const shareContract = await SHARE.deployed();
    await shareContract.setCodeVerificationEnabled(false);
    const split = await S2RD.new();
    const pfa = await PFAUnit.new();
    const uniformCollaborators = [
      accounts[0],
      accounts[1],
      accounts[2],
    ];
    await pfa.initialize(
      "/test/token/uri" /* tokenURI_ */,
      "1000000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      false /* supportsLicensing_ */,
      0 /* pricePerLicense_ */,
      shareContract.address /* shareContractAddress_ */
    );
    await split.initialize(
      uniformCollaborators /* addresses_ */,
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
});
