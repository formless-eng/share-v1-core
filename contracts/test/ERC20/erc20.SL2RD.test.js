const SHARE = artifacts.require("SHARE");
const SL2RD = artifacts.require("SL2RD");
const PFAUnit = artifacts.require("PFAUnit");
const MockERC20 = artifacts.require("MockERC20");
const OperatorRegistry = artifacts.require("OperatorRegistry");
const DEFAULT_ADDRESS_INDEX = 0;
const NON_OWNER_ADDRESS_INDEX = 1;
const MAX_SL2RD_PARTITION_SIZE = 100;

function calculateSplitIndexUsingPartition(
  partitionIndex,
  partitionSize = MAX_SL2RD_PARTITION_SIZE,
  offset = 0
) {
  return partitionIndex * partitionSize + offset;
}

function normalizeAddress(address) {
  return address.toLowerCase();
}

contract("ERC20 payable SL2RD", (accounts) => {
  specify("Payable with ERC20 token and single stakeholder", async () => {
    const shareContract = await SHARE.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    const splitContract = await SL2RD.new();
    const mockERC20 = await MockERC20.new();
    const payerAddress = accounts[DEFAULT_ADDRESS_INDEX];
    const payeeAddress = accounts[1];

    await splitContract.initialize(
      [payeeAddress] /* addresses_ */,
      [0] /* tokenIds_ */,
      0 /* communitySplitsBasisPoints_ */,
      shareContract.address /* shareContractAddress_ */,
      operatorRegistry.address /* operatorRegistryAddress_ */
    );

    await splitContract.setERC20ContractAddress(mockERC20.address);

    // Payer account transfers $1 USDC to SL2RD contract.
    await mockERC20.transfer(splitContract.address, 1, {
      from: payerAddress,
    });

    // Payer account calls receive() with 0 value.
    await web3.eth.sendTransaction({
      from: payerAddress,
      to: splitContract.address,
      value: web3.utils.toWei("0", "ether"),
    });

    // Confirm that the balance of the payee within the SL2RD contract
    // is updated to $1 in USDC.
    assert.equal(await mockERC20.balanceOf(payeeAddress), 1);
  });

  specify("Payable with ERC20 token and multiple stakeholders", async () => {
    const shareContract = await SHARE.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    const splitContract = await SL2RD.new();
    const mockERC20 = await MockERC20.new();
    const payerAddress = accounts[DEFAULT_ADDRESS_INDEX];
    const payeeAddress1 = accounts[1];
    const payeeAddress2 = accounts[2];
    const payeeAddresses = [payeeAddress1, payeeAddress2];

    await splitContract.initialize(
      payeeAddresses /* addresses_ */,
      [0, 1] /* tokenIds_ */,
      0 /* communitySplitsBasisPoints_ */,
      shareContract.address /* shareContractAddress_ */,
      operatorRegistry.address /* operatorRegistryAddress_ */
    );

    await splitContract.setERC20ContractAddress(mockERC20.address);

    for (let i = 0; i < 2; i += 1) {
      // Payer account transfers $1 USDC to SL2RD contract.
      await mockERC20.transfer(splitContract.address, 1, {
        from: payerAddress,
      });

      // Payer account calls receive() with 0 value.
      await web3.eth.sendTransaction({
        from: payerAddress,
        to: splitContract.address,
        value: web3.utils.toWei("0", "ether"),
        gas: 100000,
      });

      // Confirm that the balance of the payee within the SL2RD contract
      // is updated to $1 in USDC.
      assert.equal(await mockERC20.balanceOf(payeeAddresses[i]), 1);
    }
  });

  specify("Multipart split comprehensive test with ERC20 token", async () => {
    const NUM_TRANSACTIONS = 60;
    const SIZE = 20;
    const shareContract = await SHARE.deployed();
    const operatorRegistry = await OperatorRegistry.deployed();
    const mockERC20 = await MockERC20.new();
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

    await splitContract.setERC20ContractAddress(mockERC20.address);

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
      // Payer account transfers $1 USDC to SL2RD contract.
      await mockERC20.transfer(splitContract.address, 1, {
        from: accounts[DEFAULT_ADDRESS_INDEX],
      });
      await web3.eth
        .sendTransaction({
          to: splitContract.address,
          from: accounts[DEFAULT_ADDRESS_INDEX],
          value: web3.utils.toWei("0", "ether"),
          gas: 100000,
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

    for (let i = 0; i < uniformCollaborators.length; i += 1) {
      assert.equal(await mockERC20.balanceOf(uniformCollaborators[i]), 3);
    }
  });
});
