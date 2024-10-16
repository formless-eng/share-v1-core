const SHARE = artifacts.require("SHARE");
const SL2RD_V2 = artifacts.require("SL2RD_V2");
const PFAUnit = artifacts.require("PFAUnit");
const OperatorRegistry = artifacts.require("OperatorRegistry");
const MockLiquidityPool = artifacts.require("MockLiquidityPool");
const CodeVerification = artifacts.require("CodeVerification");

function normalizeAddress(address) {
  return address.toLowerCase();
}

async function findNode(splitContract, address) {
  let node = await splitContract.getShareholder(
    await splitContract.shareholdersRootNodeId()
  );
  while (node.next != "0x0000000000000000000000000000000000000000") {
    node = await splitContract.getShareholder(node.next);
    if (node.shareholderAddress === address) {
      return node;
    }
  }
  return null;
}

contract("SL2RD_V2", (accounts) => {
  specify("Contract initialization", async () => {
    const shareContract = await SHARE.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    const splitContract = await SL2RD_V2.new();
    await splitContract.initialize(
      "Unicorn Token",
      "UNICORN",
      10e6 /* totalShares */,
      10e3 /* totalPublicShares */,
      1000 /* batchSize */,
      shareContract.address,
      operatorRegistry.address,
      false /* testMode */
    );
    assert.equal(await splitContract.name(), "Unicorn Token");
    assert.equal(await splitContract.symbol(), "UNICORN");
    assert.equal(await splitContract.totalSupply(), 10e6);
    assert.equal(await splitContract.paymentBatchSize(), 1000);
    assert.equal(await splitContract.decimals(), 0);
    assert.equal(await splitContract.totalPublicShares(), 10e3);
    assert.equal(await splitContract.countPublicSharesDistributed(), 0);
    assert.equal(await splitContract.totalSlots(), 10e6);
    assert.equal(await splitContract.totalCommunitySlots(), 10e3);
    assert.equal(await splitContract.countAllocatedCommunitySlots(), 0);
  });

  specify("Contract setters", async () => {
    const shareContract = await SHARE.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    const splitContract = await SL2RD_V2.new();
    await splitContract.initialize(
      "Unicorn Token",
      "UNICORN",
      10e6 /* totalShares */,
      10e6 /* totalPublicShares */,
      1000 /* batchSize */,
      shareContract.address,
      operatorRegistry.address,
      false /* testMode */
    );
    await splitContract.setPaymentBatchSize(100);
    await splitContract.setDecimals(18);
    await splitContract.setCodeVerificationEnabled(false);
    assert.equal(await splitContract.paymentBatchSize(), 100);
    assert.equal(await splitContract.decimals(), 18);
    assert.equal(await splitContract._codeVerificationEnabled(), false);
  });

  specify(
    "Transferring shares dynamically increases shareholders list size",
    async () => {
      const shareContract = await SHARE.deployed();
      const splitContract = await SL2RD_V2.new();
      const operatorRegistry = await OperatorRegistry.deployed();
      await splitContract.initialize(
        "Unicorn Token",
        "UNICORN",
        10e6 /* totalShares */,
        10e6 /* totalPublicShares */,
        1000 /* batchSize */,
        shareContract.address,
        operatorRegistry.address,
        false /* testMode */
      );
      for (let i = 0; i < 10; i++) {
        await splitContract.transfer(accounts[i], 1000, {
          from: accounts[0],
        });
      }
      const shareholdersRootNodeId =
        await splitContract.shareholdersRootNodeId();
      const shareholdersRootNode = await splitContract.getShareholder(
        shareholdersRootNodeId
      );
      let node = shareholdersRootNode;
      let nodeCount = 1;
      while (node.next != "0x0000000000000000000000000000000000000000") {
        assert.equal(node.shareholderAddress, accounts[nodeCount - 1]);
        node = await splitContract.getShareholder(node.next);
        nodeCount += 1;
      }
      assert.equal(nodeCount, 10);
    }
  );

  specify(
    "Transferring shares dynamically decreases shareholders list size",
    async () => {
      const shareContract = await SHARE.deployed();
      const splitContract = await SL2RD_V2.new();
      const operatorRegistry = await OperatorRegistry.deployed();
      await splitContract.initialize(
        "Unicorn Token" /* name */,
        "UNICORN" /* symbol */,
        100 /* totalShares */,
        100 /* totalPublicShares */,
        1000 /* batchSize */,
        shareContract.address,
        operatorRegistry.address,
        true /* testMode */
      );
      // Transfer 10 shares to each of 5 accounts, resulting
      // in 50 shares remaining in the balance of the contract
      // owner.
      for (let i = 0; i < 5; i++) {
        await splitContract.transfer(accounts[i], 10, {
          from: accounts[0],
        });
      }
      assert.isNotNull(await findNode(splitContract, accounts[2]));
      assert.equal(
        +(await splitContract.balanceOf(accounts[2])).toString(),
        10
      );

      // Transfer all 10 shares from account 2 to account 1,
      // resulting in a removal of account 2 from the list
      await splitContract.transferFrom(accounts[2], accounts[1], 10, {
        from: accounts[0],
      });
      assert.isNull(await findNode(splitContract, accounts[2]));
      assert.equal(+(await splitContract.balanceOf(accounts[2])).toString(), 0);
    }
  );

  specify("Payable with rotating recipient", async () => {
    const NUM_TRANSACTIONS = 50;
    const paymentBatchSize = 1;
    const shareContract = await SHARE.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    const splitContract = await SL2RD_V2.new();

    try {
      await splitContract.initialize(
        "Unicorn Token",
        "UNICORN",
        50 /* totalShares */,
        50 /* totalPublicShares */,
        paymentBatchSize /* payment batch size */,
        shareContract.address,
        operatorRegistry.address,
        true /* testMode */
      );
    } catch (error) {
      console.log(error);
      console.log(error.message);
      assert(false, "Initialization failed");
    }

    const expectedShareholderPaymentsTable = new Array(NUM_TRANSACTIONS).fill(
      accounts[0],
      0,
      NUM_TRANSACTIONS
    );
    const initialSharesPerHolder = 5;
    for (let i = 1; i < NUM_TRANSACTIONS / initialSharesPerHolder; i++) {
      await splitContract.transfer(accounts[i], initialSharesPerHolder, {
        from: accounts[0],
      });
      expectedShareholderPaymentsTable.fill(
        accounts[i],
        i * initialSharesPerHolder,
        i * initialSharesPerHolder + initialSharesPerHolder
      );
    }
    console.log(expectedShareholderPaymentsTable);
    for (let i = 0; i < 10; i++) {
      console.log(
        `${accounts[i]} ${await splitContract.balanceOf(accounts[i])}`
      );
    }

    for (let i = 0; i < NUM_TRANSACTIONS; i += 1) {
      await web3.eth
        .sendTransaction({
          to: splitContract.address,
          from: accounts[0],
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
              console.log(mostRecentEvent);
              assert.equal(events.length, (i + 1) * paymentBatchSize);
              assert.equal(
                normalizeAddress(mostRecentEvent.returnValues.to.toLowerCase()),
                normalizeAddress(expectedShareholderPaymentsTable[i])
              );
              assert.equal(mostRecentEvent.returnValues.value, 1);
            });
        });
    }
  });

  specify(
    "Transferring public shares allowed up until allocation reached",
    async () => {
      const shareContract = await SHARE.deployed();
      const splitContract = await SL2RD_V2.new();
      const operatorRegistry = await OperatorRegistry.deployed();
      await splitContract.initialize(
        "Unicorn Token",
        "UNICORN",
        100 /* totalShares */,
        50 /* totalPublicShares */,
        1 /* batchSize */,
        shareContract.address,
        operatorRegistry.address,
        true /* testMode */
      );
      await splitContract.transferPublicShares(accounts[1], 50, {
        from: accounts[0],
      });
      assert.equal(await splitContract.balanceOf(accounts[1]), 50);

      try {
        await splitContract.transferPublicShares(accounts[1], 1, {
          from: accounts[0],
        });
        assert(false, "transferPublicShares should have failed");
      } catch (error) {
        console.log(error.message);
        assert(error.message.includes("SHARE031"));
      }
    }
  );

  specify("Shareholder balances are updated correctly", async () => {
    const shareContract = await SHARE.deployed();
    const splitContract = await SL2RD_V2.new();
    const operatorRegistry = await OperatorRegistry.deployed();
    await splitContract.initialize(
      "Unicorn Token",
      "UNICORN",
      100 /* totalShares */,
      100 /* totalPublicShares */,
      1 /* batchSize */,
      shareContract.address,
      operatorRegistry.address,
      true /* testMode */
    );
    await splitContract.transfer(accounts[1], 10, {
      from: accounts[0],
    });
    await splitContract.transfer(accounts[2], 5, {
      from: accounts[0],
    });
    await splitContract.transfer(accounts[3], 5, {
      from: accounts[0],
    });
    const balances = await splitContract.shareholderBalances(0, 4);
    assert.notStrictEqual(
      balances.map((object) => +object.balance),
      [80, 10, 5, 5]
    );
  });

  specify("Owner can reclaim PFA", async () => {
    const shareContract = await SHARE.deployed();
    await shareContract.setCodeVerificationEnabled(false);
    const splitContract = await SL2RD_V2.new();
    const operatorRegistry = await OperatorRegistry.deployed();
    await splitContract.initialize(
      "Unicorn Token",
      "UNICORN",
      100 /* totalShares */,
      100 /* totalPublicShares */,
      1 /* payment batch size */,
      shareContract.address,
      operatorRegistry.address,
      false /* testMode */
    );
    const pfa = await PFAUnit.new();
    await pfa.initialize(
      "/test/token/uri" /* tokenURI_ */,
      "1000000000" /* pricePerAccess_ */,
      300 /* grantTTL_ */,
      false /* supportsLicensing_ */,
      0 /* pricePerLicense_ */,
      shareContract.address /* shareContractAddress_ */
    );
    await pfa.transferOwnership(splitContract.address);
    assert.equal(splitContract.address, await pfa.owner());
    await splitContract.reclaim(pfa.address, {
      from: accounts[0],
    });
    assert.equal(accounts[0], await pfa.owner());
  });

  specify(
    "Transfer reverts if liquidity pool contract not source code verified",
    async () => {
      const shareContract = await SHARE.new();
      await shareContract.setCodeVerificationEnabled(true);
      const splitContract = await SL2RD_V2.new();
      const operatorRegistry = await OperatorRegistry.deployed();
      const liquidityPool = await MockLiquidityPool.deployed();
      await splitContract.initialize(
        "Unicorn Token",
        "UNICORN",
        100 /* totalShares */,
        100 /* totalPublicShares */,
        1 /* batchSize */,
        shareContract.address,
        operatorRegistry.address,
        true /* testMode */
      );
      try {
        await splitContract.transfer(liquidityPool.address, 10, {
          from: accounts[0],
        });
        assert(false, "transfer should have failed");
      } catch (error) {
        console.log(error.message);
        assert(error.message.includes("SHARE007"));
      }
    }
  );

  specify(
    "Transfer succeeds after approving liquidity pool contract",
    async () => {
      const shareContract = await SHARE.new();
      await shareContract.setCodeVerificationEnabled(true);
      const splitContract = await SL2RD_V2.new();
      const operatorRegistry = await OperatorRegistry.deployed();
      const liquidityPool = await MockLiquidityPool.deployed();
      const verifier = await CodeVerification.deployed();
      await splitContract.initialize(
        "Unicorn Token",
        "UNICORN",
        100 /* totalShares */,
        100 /* totalPublicShares */,
        1 /* batchSize */,
        shareContract.address,
        operatorRegistry.address,
        true /* testMode */
      );
      await splitContract.approveLiquidityPoolCodeHash(
        await verifier.readCodeHash(liquidityPool.address)
      );
      await splitContract.transfer(liquidityPool.address, 10, {
        from: accounts[0],
      });
      assert.equal(await splitContract.balanceOf(liquidityPool.address), 10);
    }
  );
});
