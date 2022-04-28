const SHARE = artifacts.require("SHARE");
const S2RD = artifacts.require("S2RD");
const DEFAULT_ADDRESS_INDEX = 0;

const Shared = require("../migrations/Shared");

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
});
