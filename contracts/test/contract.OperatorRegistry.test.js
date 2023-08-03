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
      const retiredShareVerifiedOperator = accounts[5];
      await operatorRegistry.initialize(
        verifiedShareOperatorEOAs /* shareEOAOperators_ */
      );

      assert(
        operatorRegistry.isOperator(retiredShareVerifiedOperator),
        `Operator address ${retiredShareVerifiedOperator} does not exist in registry`
      );

      const retiredOperation =
        operatorRegistry.removeVerifiedOperator(
          retiredShareVerifiedOperator
        );

      assert(
        retiredOperation,
        "Retired SHARE operator not removed from registry."
      );
    }
  );

  specify("Fund the operator addresses", async () => {
    const operatorRegistry = await OperatorRegistry.deployed();
    const fundAmount = web3.utils.toWei("10", "ether");
    const expectedFundsPerOperator =
      fundAmount / verifiedShareOperatorEOAs.length;
    const initialBalance = new Array(
      verifiedShareOperatorEOAs.length
    );

    await operatorRegistry.initialize(
      verifiedShareOperatorEOAs /* shareEOAOperators_ */
    );

    for (let i = 0; i < verifiedShareOperatorEOAs.length; i++) {
      initialBalance[i] = await web3.eth.getBalance(
        verifiedShareOperatorEOAs[i]
      );
    }

    try {
      // Fund all operator addresses
      await operatorRegistry.fundOperatorAddresses({
        from: accounts[0],
        value: fundAmount,
      });
    } catch (error) {
      assert(false, "Funding broke.");
    }

    // Check that each operator address has the correct balance
    for (let i = 0; i < verifiedShareOperatorEOAs.length; i++) {
      const newBalance = await web3.eth.getBalance(
        verifiedShareOperatorEOAs[i]
      );

      fundsDelta = newBalance - initialBalance[i];
      assert.equal(
        expectedFundsPerOperator,
        fundsDelta,
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
      await operatorRegistry.listOperatorRegistry();

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
