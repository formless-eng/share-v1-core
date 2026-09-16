const ExecutionVault = artifacts.require("ExecutionVault");
const OperatorRegistry = artifacts.require("OperatorRegistry");
const MockERC20 = artifacts.require("MockERC20");
const MockAccess = artifacts.require("MockAccess");

async function expectRevert(promise, reason) {
  try {
    await promise;
    assert.fail("Expected transaction to revert");
  } catch (error) {
    assert(error.message.includes(reason), error.message);
  }
}

contract("ExecutionVault", (accounts) => {
  const owner = accounts[0];
  const operator = accounts[1];
  const outsider = accounts[2];
  const recipient = accounts[3];
  const payment = web3.utils.toBN("1000000");

  let vault;
  let registry;
  let usdc;

  beforeEach(async () => {
    registry = await OperatorRegistry.new();
    await registry.initialize([operator]);
    usdc = await MockERC20.new();
    vault = await ExecutionVault.new();
    await vault.initialize(registry.address, usdc.address);
    await usdc.transfer(vault.address, payment);
  });

  specify("an operator approves and executes an ERC20 access payment", async () => {
    const target = await MockAccess.new(usdc.address, payment);

    await vault.approve(usdc.address, target.address, payment, {
      from: operator,
    });
    await vault.access(target.address, 7, recipient, { from: operator });

    assert.equal(await target.lastRecipient(), recipient);
    assert.equal((await target.lastTokenId()).toString(), "7");
    assert.equal((await usdc.balanceOf(target.address)).toString(), payment.toString());
  });

  specify("forwards native value when executing access", async () => {
    const target = await MockAccess.new(usdc.address, 0);
    const value = web3.utils.toWei("1", "ether");

    await vault.access(target.address, 0, recipient, {
      from: operator,
      value,
    });

    assert.equal((await target.lastValue()).toString(), value);
  });

  specify("rejects unauthorized callers and the wrong token", async () => {
    const target = await MockAccess.new(usdc.address, 0);
    const otherToken = await MockERC20.new();

    await expectRevert(
      vault.access(target.address, 0, recipient, { from: outsider }),
      "SHARE030",
    );
    await expectRevert(
      vault.approve(otherToken.address, target.address, payment, {
        from: operator,
      }),
      "SHARE061",
    );
  });

  specify("only the owner withdraws all USDC", async () => {
    await expectRevert(vault.withdrawUSDC({ from: operator }), "Ownable");

    const before = web3.utils.toBN(await usdc.balanceOf(owner));
    await vault.withdrawUSDC({ from: owner });
    const after = web3.utils.toBN(await usdc.balanceOf(owner));

    assert(after.sub(before).eq(payment));
    assert.equal((await usdc.balanceOf(vault.address)).toString(), "0");
  });
});
