const SHARE = artifacts.require("SHARE");
const PFAUnit = artifacts.require("PFAUnit");
const S2RD = artifacts.require("S2RD");
const CodeVerification = artifacts.require("CodeVerification");
const PFACollection = artifacts.require("PFACollection");
const MockPFARevertsOnAccess = artifacts.require(
  "MockPFARevertsOnAccess"
);

const DEFAULT_ADDRESS_INDEX = 0;
const UNIT_TOKEN_INDEX = 0;
const NON_OWNER_ADDRESS_INDEX = 1;
const GRANT_TTL_PRECISION_SEC = 5;
const LICENSE_TTL_PRECISION_SEC = 5;

/**
 * Pops an event in LIFO order from a list of events. Does not modify
 * the list.
 * @param {list} events A list of blockchain events.
 * @param {integer} indexIntoPast How far backward to go when popping
 * the event off of the LIFO stack.
 */
function popEventLIFO(events, indexIntoPast) {
  return events[events.length - indexIntoPast - 1];
}

contract("PFACollection", (accounts) => {
  specify("License 1 PFA with 1 transaction", async () => {
    const collection = await PFACollection.new();
    const shareContract = await SHARE.deployed();
    await shareContract.setCodeVerificationEnabled(false);
    const pfa1 = await PFAUnit.new();
    await pfa1.initialize(
      "/test/asset/uri" /* tokenURI_ */,
      "1000000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      true /* supportsLicensing_ */,
      shareContract.address /* shareContractAddress_ */
    );
    await collection.initialize(
      [pfa1.address] /* addresses_ */,
      "/test/collection/uri" /* tokenURI_ */,
      "2000000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      false /* supportsLicensing_ */,
      shareContract.address /* shareContractAddress_ */
    );
    await pfa1.license(collection.address);
    await collection.access(
      UNIT_TOKEN_INDEX,
      accounts[DEFAULT_ADDRESS_INDEX],
      {
        from: accounts[DEFAULT_ADDRESS_INDEX],
        value: "2000000000",
      }
    );
    const pfaPaymentEvents = await pfa1.getPastEvents(
      "PaymentToOwner",
      {
        fromBlock: 0,
        toBlock: "latest",
      }
    );
    const collectionEvents = await collection.getPastEvents(
      "Payment",
      {
        fromBlock: 0,
        toBlock: "latest",
      }
    );
    // The revenue (2000000000 wei) will be split as follows:
    // 1000000000 to the PFA
    // 1000000000 (remaining balance) to the collection owner
    assert.equal(
      pfaPaymentEvents[0].returnValues.value,
      "1000000000"
    );
    assert.equal(
      collectionEvents[0].returnValues.value,
      "1000000000"
    );
    assert.equal(
      collectionEvents[0].returnValues.recipient,
      pfa1.address
    );
    assert.equal(
      collectionEvents[1].returnValues.value,
      "1000000000"
    );
    assert.equal(
      collectionEvents[1].returnValues.recipient,
      accounts[DEFAULT_ADDRESS_INDEX]
    );
    // The DDN will look for:
    // (1) a grant on the collection
    // (2) a license on the underlying PFA issued _to the collection_
    assert.equal(
      (
        await collection.getPastEvents("Grant", {
          fromBlock: 0,
          toBlock: "latest",
          filter: {
            recipient: accounts[DEFAULT_ADDRESS_INDEX],
            tokenId: UNIT_TOKEN_INDEX,
          },
        })
      ).length,
      1
    );
    assert.equal(
      (
        await pfa1.getPastEvents("License", {
          fromBlock: 0,
          toBlock: "latest",
          filter: {
            recipient: collection.address,
          },
        })
      ).length,
      1
    );
  });

  specify("License 3 PFAs with 10 transactions", async () => {
    const NUM_TRANSACTIONS = 10;
    const collection = await PFACollection.new();
    const shareContract = await SHARE.deployed();
    await shareContract.setCodeVerificationEnabled(false);
    const pfa1 = await PFAUnit.new();
    const pfa2 = await PFAUnit.new();
    const pfa3 = await PFAUnit.new();
    const pfas = [pfa1, pfa2, pfa3];
    const pfaPayments = [1000000000, 5000000000, 7000000000];
    await pfa1.initialize(
      "/test/asset/uri" /* tokenURI_ */,
      "1000000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      true /* supportsLicensing_ */,
      shareContract.address /* shareContractAddress_ */
    );
    await pfa2.initialize(
      "/test/asset/uri" /* tokenURI_ */,
      "5000000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      true /* supportsLicensing_ */,
      shareContract.address /* shareContractAddress_ */
    );
    await pfa3.initialize(
      "/test/asset/uri" /* tokenURI_ */,
      "7000000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      true /* supportsLicensing_ */,
      shareContract.address /* shareContractAddress_ */
    );
    await collection.initialize(
      [pfa1.address, pfa2.address, pfa3.address] /* addresses_ */,
      "/test/collection/uri" /* tokenURI_ */,
      "9000000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      false /* supportsLicensing_ */,
      shareContract.address /* shareContractAddress_ */
    );
    await pfa1.license(collection.address);
    await pfa2.license(collection.address);
    await pfa3.license(collection.address);

    for (let i = 0; i < NUM_TRANSACTIONS; i++) {
      await collection.access(
        UNIT_TOKEN_INDEX,
        accounts[DEFAULT_ADDRESS_INDEX],
        {
          from: accounts[DEFAULT_ADDRESS_INDEX],
          value: "9000000000",
        }
      );
      const recipientPFA = pfas[i % pfas.length];
      const pfaPaymentAmount = pfaPayments[i % pfas.length];
      const pfaPaymentEvents = await recipientPFA.getPastEvents(
        "PaymentToOwner",
        {
          fromBlock: 0,
          toBlock: "latest",
        }
      );
      const collectionEvents = await collection.getPastEvents(
        "Payment",
        {
          fromBlock: 0,
          toBlock: "latest",
        }
      );
      console.log(popEventLIFO(collectionEvents, 0));
      console.log(popEventLIFO(pfaPaymentEvents, 0));
      assert.equal(
        popEventLIFO(pfaPaymentEvents, 0).returnValues.value,
        pfaPaymentAmount
      );
      assert.equal(
        popEventLIFO(collectionEvents, 0).returnValues.value,
        9000000000 - pfaPaymentAmount
      );
      assert.equal(
        popEventLIFO(collectionEvents, 0).returnValues.recipient,
        accounts[DEFAULT_ADDRESS_INDEX]
      );
      assert.equal(
        popEventLIFO(collectionEvents, 1).returnValues.value,
        pfaPaymentAmount
      );
      assert.equal(
        popEventLIFO(collectionEvents, 1).returnValues.recipient,
        recipientPFA.address
      );
      assert.equal(
        (
          await collection.getPastEvents("Grant", {
            fromBlock: 0,
            toBlock: "latest",
            filter: {
              recipient: accounts[DEFAULT_ADDRESS_INDEX],
              tokenId: UNIT_TOKEN_INDEX,
            },
          })
        ).length,
        i + 1
      );
      assert.equal(
        (
          await recipientPFA.getPastEvents("License", {
            fromBlock: 0,
            toBlock: "latest",
            filter: {
              recipient: collection.address,
            },
          })
        ).length,
        1
      );
    }
  });

  specify(
    "Sub-license a collection which licenses a PFA",
    async () => {
      const collection1 = await PFACollection.new();
      const collection2 = await PFACollection.new();
      const shareContract = await SHARE.deployed();
      await shareContract.setCodeVerificationEnabled(false);
      const pfa1 = await PFAUnit.new();
      await pfa1.initialize(
        "/test/asset/uri" /* tokenURI_ */,
        "1000000000" /* pricePerAccess_ */,
        300 /* grantTTL_ */,
        true /* supportsLicensing_ */,
        shareContract.address /* shareContractAddress_ */
      );
      await collection1.initialize(
        [pfa1.address] /* addresses_ */,
        "/test/collection/uri" /* tokenURI_ */,
        "2000000000" /* pricePerAccess_ */,
        300 /* grantTTL_ */,
        true /* supportsLicensing_ */,
        shareContract.address /* shareContractAddress_ */
      );
      await collection2.initialize(
        [collection1.address] /* addresses_ */,
        "/test/collection/uri" /* tokenURI_ */,
        "5000000000" /* pricePerAccess_ */,
        300 /* grantTTL_ */,
        true /* supportsLicensing_ */,
        shareContract.address /* shareContractAddress_ */
      );
      await pfa1.license(collection1.address);
      await collection1.license(collection2.address);

      await collection2.access(
        UNIT_TOKEN_INDEX,
        accounts[DEFAULT_ADDRESS_INDEX],
        {
          from: accounts[DEFAULT_ADDRESS_INDEX],
          value: "5000000000",
        }
      );
      const pfaPaymentEvents = await pfa1.getPastEvents(
        "PaymentToOwner",
        {
          fromBlock: 0,
          toBlock: "latest",
        }
      );
      const collection1Events = await collection1.getPastEvents(
        "Payment",
        {
          fromBlock: 0,
          toBlock: "latest",
        }
      );
      const collection2Events = await collection2.getPastEvents(
        "Payment",
        {
          fromBlock: 0,
          toBlock: "latest",
        }
      );
      assert.equal(
        pfaPaymentEvents[0].returnValues.value,
        "1000000000"
      );
      assert.equal(
        collection1Events[0].returnValues.value,
        "1000000000"
      );
      assert.equal(
        collection1Events[0].returnValues.recipient,
        pfa1.address
      );
      assert.equal(
        collection1Events[1].returnValues.value,
        "1000000000"
      );
      assert.equal(
        collection1Events[1].returnValues.recipient,
        accounts[DEFAULT_ADDRESS_INDEX]
      );
      assert.equal(
        collection2Events[0].returnValues.value,
        "2000000000"
      );
      assert.equal(
        collection2Events[0].returnValues.recipient,
        collection1.address
      );
      assert.equal(
        collection2Events[1].returnValues.value,
        "3000000000"
      );
      assert.equal(
        collection2Events[1].returnValues.recipient,
        accounts[DEFAULT_ADDRESS_INDEX]
      );
      assert.equal(
        (
          await collection2.getPastEvents("Grant", {
            fromBlock: 0,
            toBlock: "latest",
            filter: {
              recipient: accounts[DEFAULT_ADDRESS_INDEX],
              tokenId: UNIT_TOKEN_INDEX,
            },
          })
        ).length,
        1
      );
      assert.equal(
        (
          await collection1.getPastEvents("License", {
            fromBlock: 0,
            toBlock: "latest",
            filter: {
              recipient: collection2.address,
            },
          })
        ).length,
        1
      );
      assert.equal(
        (
          await pfa1.getPastEvents("License", {
            fromBlock: 0,
            toBlock: "latest",
            filter: {
              recipient: collection1.address,
            },
          })
        ).length,
        1
      );
    }
  );
});

// contract("License grant", (accounts) => {
//   specify("License grant", async () => {
//     const shareContract = await SHARE.deployed();
//     const assetContract = await PFAUnit.deployed();
//     const collectionContract = await PFACollection.deployed();
//     const verifier = await CodeVerification.deployed();
//     await shareContract.addApprovedBuild(
//       await verifier.readCodeHash(
//         assetContract.address
//       ) /* codeHash = keccak256(S2RD code) */,
//       2 /* buildType_ = PFA_UNIT  */,
//       "solc" /* compilerBinaryTarget_ */,
//       "0.8.11+commit.d7f03943" /* compilerVersion_ */,
//       accounts[DEFAULT_ADDRESS_INDEX] /* authorAddress_ */
//     );
//     await shareContract.addApprovedBuild(
//       await verifier.readCodeHash(
//         collectionContract.address
//       ) /* codeHash = keccak256(S2RD code) */,
//       3 /* buildType_ = COLLECTION  */,
//       "solc" /* compilerBinaryTarget_ */,
//       "0.8.11+commit.d7f03943" /* compilerVersion_ */,
//       accounts[DEFAULT_ADDRESS_INDEX] /* authorAddress_ */
//     );
//     await assetContract.initialize(
//       "/test/token/uri" /* tokenURI_ */,
//       "1000000000" /* pricePerAccess (wei) */,
//       300 /* grantTTL_ */,
//       true /* supportsLicensing */,
//       shareContract.address /* shareContractAddress_ */
//     );
//     await collectionContract.initialize(
//       [assetContract.address] /* addresses_ */,
//       "/test/token/uri" /* tokenURI_ */,
//       "2000000000" /* pricePerAccess (wei) */,
//       300 /* grantTTL_ */,
//       true /* supportsLicensing */,
//       shareContract.address /* shareContractAddress_ */
//     );
//     await shareContract.license(
//       assetContract.address /* licensor */,
//       collectionContract.address /* licensee */,
//       {
//         from: accounts[DEFAULT_ADDRESS_INDEX],
//       }
//     );
//     assert.equal(
//       (
//         await assetContract.getPastEvents("License", {
//           filter: {
//             recipient: collectionContract.address,
//           },
//         })
//       ).length,
//       1
//     );
//   });
// });
