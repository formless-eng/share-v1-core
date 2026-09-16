const ExecutionVault = artifacts.require("ExecutionVault");
const OperatorRegistry = artifacts.require("OperatorRegistry");
const MockERC20 = artifacts.require("MockERC20");
const SHARE = artifacts.require("SHARE");
const PFAUnit = artifacts.require("PFAUnit");

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
  let share;
  let asset;

  beforeEach(async () => {
    registry = await OperatorRegistry.new();
    await registry.initialize([operator]);
    usdc = await MockERC20.new();
    vault = await ExecutionVault.new();
    await vault.initialize(registry.address, usdc.address);
    await usdc.transfer(vault.address, payment);

    share = await SHARE.new();
    await share.setCodeVerificationEnabled(false);
    asset = await PFAUnit.new();
    await asset.initialize(
      "/test/token/uri",
      payment,
      300,
      false,
      0,
      share.address,
    );
  });

  specify("an operator executes a SHARE ERC20 access payment", async () => {
    await share.setERC20ContractAddress(usdc.address);
    await asset.setERC20ContractAddress(usdc.address);
    const grossPrice = await share.grossPricePerAccess(asset.address, 0);
    await usdc.transfer(vault.address, grossPrice.sub(payment));
    const ownerBalanceBefore = web3.utils.toBN(await usdc.balanceOf(owner));

    await vault.approve(usdc.address, share.address, grossPrice, {
      from: operator,
    });
    await vault.access(share.address, asset.address, 0, recipient, {
      from: operator,
    });

    assert.notEqual(
      (await share.grantTimestamp(asset.address, recipient)).toString(),
      "0",
    );
    const ownerBalanceAfter = web3.utils.toBN(await usdc.balanceOf(owner));
    assert(ownerBalanceAfter.sub(ownerBalanceBefore).eq(payment));
  });

  specify(
    "forwards native value through SHARE when executing access",
    async () => {
      const value = await share.grossPricePerAccess(asset.address, 0);

      await vault.access(share.address, asset.address, 0, recipient, {
        from: operator,
        value,
      });

      assert.notEqual(
        (await share.grantTimestamp(asset.address, recipient)).toString(),
        "0",
      );
    },
  );

  specify(
    "uses the uninitialized-contract error for vault operations",
    async () => {
      const uninitializedVault = await ExecutionVault.new();

      await expectRevert(
        uninitializedVault.access(vault.address, 0, recipient, { from: owner }),
        "SHARE014",
      );
      await expectRevert(
        uninitializedVault.approve(usdc.address, vault.address, payment, {
          from: owner,
        }),
        "SHARE014",
      );
      await expectRevert(
        uninitializedVault.withdrawUSDC({ from: owner }),
        "SHARE014",
      );
    },
  );

  specify("rejects unauthorized callers and the wrong token", async () => {
    const otherToken = await MockERC20.new();

    await expectRevert(
      vault.access(share.address, asset.address, 0, recipient, {
        from: outsider,
      }),
      "SHARE030",
    );
    await expectRevert(
      vault.approve(otherToken.address, share.address, payment, {
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
