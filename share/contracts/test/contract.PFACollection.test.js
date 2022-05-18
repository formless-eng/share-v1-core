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
function popEventLIFO(events, indexIntoPast = 0) {
  return events[events.length - indexIntoPast - 1];
}

/**
 *  * Pops an event in FIFO order from a list of events. Does not modify
 * the list.
 * @param {list} events A list of blockchain events.
 * @param {integer} index How far forward to go when popping
 * the event off of the FIFO stack.
 */
function popEventFIFO(events, index = 0) {
  return events[index];
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
      popEventFIFO(pfaPaymentEvents).returnValues.value,
      "1000000000"
    );
    assert.equal(
      popEventFIFO(collectionEvents).returnValues.value,
      "1000000000"
    );
    assert.equal(
      popEventFIFO(collectionEvents).returnValues.recipient,
      pfa1.address
    );
    assert.equal(
      popEventFIFO(collectionEvents, 1).returnValues.value,
      "1000000000"
    );
    assert.equal(
      popEventFIFO(collectionEvents, 1).returnValues.recipient,
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

  specify("License PFA with depth of 2", async () => {
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
      popEventFIFO(pfaPaymentEvents).returnValues.value,
      "1000000000"
    );
    assert.equal(
      popEventFIFO(collection1Events).returnValues.value,
      "1000000000"
    );
    assert.equal(
      popEventFIFO(collection1Events).returnValues.recipient,
      pfa1.address
    );
    assert.equal(
      popEventFIFO(collection1Events, 1).returnValues.value,
      "1000000000"
    );
    assert.equal(
      popEventFIFO(collection1Events, 1).returnValues.recipient,
      accounts[DEFAULT_ADDRESS_INDEX]
    );
    assert.equal(
      popEventFIFO(collection2Events).returnValues.value,
      "2000000000"
    );
    assert.equal(
      popEventFIFO(collection2Events).returnValues.recipient,
      collection1.address
    );
    assert.equal(
      popEventFIFO(collection2Events, 1).returnValues.value,
      "3000000000"
    );
    assert.equal(
      popEventFIFO(collection2Events, 1).returnValues.recipient,
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
  });

  specify("License PFA with depth of 3", async () => {
    const collection1 = await PFACollection.new();
    const collection2 = await PFACollection.new();
    const collection3 = await PFACollection.new();
    const pfaPrice = 1000000000;
    const collection1Price = 2000000000;
    const collection2Price = 5000000000;
    const collection3Price = 7000000000;
    const shareContract = await SHARE.deployed();
    await shareContract.setCodeVerificationEnabled(false);
    const pfa1 = await PFAUnit.new();
    await pfa1.initialize(
      "/test/asset/uri" /* tokenURI_ */,
      pfaPrice /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      true /* supportsLicensing_ */,
      shareContract.address /* shareContractAddress_ */
    );
    await collection1.initialize(
      [pfa1.address] /* addresses_ */,
      "/test/collection/uri" /* tokenURI_ */,
      collection1Price /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      true /* supportsLicensing_ */,
      shareContract.address /* shareContractAddress_ */
    );
    await collection2.initialize(
      [collection1.address] /* addresses_ */,
      "/test/collection/uri" /* tokenURI_ */,
      collection2Price /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      true /* supportsLicensing_ */,
      shareContract.address /* shareContractAddress_ */
    );
    await collection3.initialize(
      [collection2.address] /* addresses_ */,
      "/test/collection/uri" /* tokenURI_ */,
      collection3Price /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      true /* supportsLicensing_ */,
      shareContract.address /* shareContractAddress_ */
    );
    await pfa1.license(collection1.address);
    await collection1.license(collection2.address);
    await collection2.license(collection3.address);

    await collection3.access(
      UNIT_TOKEN_INDEX,
      accounts[DEFAULT_ADDRESS_INDEX],
      {
        from: accounts[DEFAULT_ADDRESS_INDEX],
        value: collection3Price,
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
    const collection3Events = await collection3.getPastEvents(
      "Payment",
      {
        fromBlock: 0,
        toBlock: "latest",
      }
    );
    assert.equal(
      popEventFIFO(pfaPaymentEvents).returnValues.value,
      pfaPrice
    );
    assert.equal(
      popEventFIFO(collection1Events).returnValues.value,
      pfaPrice
    );
    assert.equal(
      popEventFIFO(collection1Events).returnValues.recipient,
      pfa1.address
    );
    assert.equal(
      popEventFIFO(collection1Events, 1).returnValues.value,
      collection1Price - pfaPrice
    );
    assert.equal(
      popEventFIFO(collection1Events, 1).returnValues.recipient,
      accounts[DEFAULT_ADDRESS_INDEX]
    );
    assert.equal(
      popEventFIFO(collection2Events).returnValues.value,
      collection1Price
    );
    assert.equal(
      popEventFIFO(collection2Events).returnValues.recipient,
      collection1.address
    );
    assert.equal(
      popEventFIFO(collection2Events, 1).returnValues.value,
      collection2Price - collection1Price
    );
    assert.equal(
      popEventFIFO(collection2Events, 1).returnValues.recipient,
      accounts[DEFAULT_ADDRESS_INDEX]
    );
    assert.equal(
      popEventFIFO(collection3Events).returnValues.value,
      collection2Price
    );
    assert.equal(
      popEventFIFO(collection3Events).returnValues.recipient,
      collection2.address
    );
    assert.equal(
      popEventFIFO(collection3Events, 1).returnValues.value,
      collection3Price - collection2Price
    );
    assert.equal(
      popEventFIFO(collection3Events, 1).returnValues.recipient,
      accounts[DEFAULT_ADDRESS_INDEX]
    );
    assert.equal(
      (
        await collection3.getPastEvents("Grant", {
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
        await collection2.getPastEvents("License", {
          fromBlock: 0,
          toBlock: "latest",
          filter: {
            recipient: collection3.address,
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
  });

  specify(
    "License 2 good PFAs, 1 reverting PFA with 10 transactions",
    async () => {
      const NUM_TRANSACTIONS = 10;
      const collection = await PFACollection.new();
      const shareContract = await SHARE.deployed();
      await shareContract.setCodeVerificationEnabled(false);
      const pfa1 = await PFAUnit.new();
      const pfa2 = await PFAUnit.new();
      const pfa3 = await MockPFARevertsOnAccess.new();
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

      let revertingPFAAccessCount = 0;
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

        if (recipientPFA === pfa3) {
          revertingPFAAccessCount++;
          // the reverting PFA should cause an ItemPaymentSkipped event
          // in the collection
          assert.equal(
            (
              await collection.getPastEvents("ItemPaymentSkipped", {
                fromBlock: 0,
                toBlock: "latest",
                filter: {
                  owner: accounts[DEFAULT_ADDRESS_INDEX],
                  item: pfa3.address,
                },
              })
            ).length,
            revertingPFAAccessCount
          );
        } else {
          // all other PFAs should continue to work as we iterate
          // over the transactions, e.g. the revert does _not_
          // corrupt the state of the counter in the collection.
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
      }
    }
  );

  specify(
    "Revert on initialize with PFA that does not support licensing",
    async () => {
      const collection = await PFACollection.new();
      const shareContract = await SHARE.deployed();
      await shareContract.setCodeVerificationEnabled(false);
      const pfa1 = await PFAUnit.new();
      await pfa1.initialize(
        "/test/asset/uri" /* tokenURI_ */,
        "1000000000" /* pricePerAccess_ */,
        300 /* grantTTL_ */,
        false /* supportsLicensing_ */,
        shareContract.address /* shareContractAddress_ */
      );

      try {
        await collection.initialize(
          [pfa1.address] /* addresses_ */,
          "/test/collection/uri" /* tokenURI_ */,
          "2000000000" /* pricePerAccess_ */,
          300 /* grantTTL_ */,
          false /* supportsLicensing_ */,
          shareContract.address /* shareContractAddress_ */
        );
        assert(
          false,
          "initialize should revert when given a PFA that does not " +
            "support licensing."
        );
      } catch (error) {
        console.log(error.message);
        assert(error.message.includes("SHARE022"));
      }
    }
  );
});
