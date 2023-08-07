const OperatorRegistry = artifacts.require("OperatorRegistry");
const DEFAULT_ADDRESS_INDEX = 0;
const NON_OWNER_ADDRESS_INDEX = 1;

contract("OperatorRegistry", (accounts) => {
  const verifiedShareOperatorEOAs = [
    accounts[1],
    accounts[2],
    accounts[3],
    accounts[4],
  ];
  specify("Contract initialization", async () => {
    const operatorRegistry = await OperatorRegistry.new();

    await operatorRegistry.initialize(
      verifiedShareOperatorEOAs /* shareEOAOperators_ */
    );
    assert.equal(
      accounts[DEFAULT_ADDRESS_INDEX],
      await operatorRegistry.owner()
    );
  });

  specify(
    "Add new verified operator address to the registry",
    async () => {
      const operatorRegistry = await OperatorRegistry.deployed();
      const newShareVerifiedOperator = accounts[5];

      await operatorRegistry.initialize(
        verifiedShareOperatorEOAs /* shareEOAOperators_ */
      );
      operatorRegistry.addVerifiedOperator(newShareVerifiedOperator);

      assert(
        operatorRegistry.isOperator(newShareVerifiedOperator),
        "New SHARE operator address not properly added to registry."
      );
    }
  );

  specify(
    "Remove a verified operator address from the registry",
    async () => {
      const operatorRegistry = await OperatorRegistry.deployed();
      const addressToRemove = accounts[5];
      await operatorRegistry.initialize(
        verifiedShareOperatorEOAs /* shareEOAOperators_ */
      );

      assert(
        operatorRegistry.isOperator(addressToRemove),
        `Operator address ${addressToRemove} does not exist in registry`
      );

      const success =
        operatorRegistry.removeVerifiedOperator(addressToRemove);

      assert(
        success,
        "Retired SHARE operator not removed from registry."
      );
    }
  );

  specify("Fund the operator addresses", async () => {
    const operatorRegistry = await OperatorRegistry.deployed();
    const weiDeltaGranularity = 1000000;
    const totalFundingAmount = web3.utils.toWei("10", "ether");
    const initialBalance = new Array(
      verifiedShareOperatorEOAs.length
    );

    await operatorRegistry.initialize(
      verifiedShareOperatorEOAs /* shareEOAOperators_ */
    );

    const amountOfOperators = (
      await operatorRegistry.countOperatorAddresses()
    ).toString();

    // Verify the helper function amountOfOperators retrieved
    // properly.
    assert.equal(
      amountOfOperators,
      verifiedShareOperatorEOAs.length,
      "Number of registry addresses is not accurate to initializting array."
    );

    const fundsPerOperator = (
      totalFundingAmount / amountOfOperators
    ).toString();

    for (let i = 0; i < verifiedShareOperatorEOAs.length; i++) {
      initialBalance[i] = await web3.eth.getBalance(
        verifiedShareOperatorEOAs[i]
      );
    }

    // Fund all operator addresses
    await operatorRegistry.fundOperatorAddresses(
      totalFundingAmount,
      fundsPerOperator,
      {
        from: accounts[0],
        value: totalFundingAmount,
      }
    );

    // Check that each operator address has the correct balance
    for (let i = 0; i < verifiedShareOperatorEOAs.length; i++) {
      const newBalance = await web3.eth.getBalance(
        verifiedShareOperatorEOAs[i]
      );

      const fundsDelta = newBalance - initialBalance[i];

      console.log(
        `\nNew balance: ${newBalance}\nInitial balance: ${initialBalance[i]}\nFunds delta: ${fundsDelta}`
      );

      // If this assertion is producing errors, try restarting ganache
      // local chain, and re-running tests.
      assert(
        Math.abs(fundsPerOperator - fundsDelta) <=
          weiDeltaGranularity /* prevents dust from invalidating test */,
        `Operator ${i} was not correctly funded.`
      );
    }
  });

  specify("List all operators in the registry", async () => {
    const operatorRegistry = await OperatorRegistry.deployed();

    await operatorRegistry.initialize(
      verifiedShareOperatorEOAs /* shareEOAOperators_ */
    );

    const registeredOperators =
      await operatorRegistry.listOperatorAddresses();

    // The registeredOperators array should have the same length
    // as the verifiedShareOperatorEOAs array.
    assert.equal(
      registeredOperators.length,
      verifiedShareOperatorEOAs.length,
      "Number of registered operators does not match."
    );

    // The registeredOperators array should be identical to
    // the verifiedShareOperatorEOAs array.
    for (let i = 0; i < registeredOperators.length; i++) {
      assert.equal(
        registeredOperators[i],
        verifiedShareOperatorEOAs[i],
        "The verified operator addresses do not match."
      );
    }
  });
});
