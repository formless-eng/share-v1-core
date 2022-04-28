const MockImmutable = artifacts.require("MockImmutable");
const Immutable = artifacts.require("Immutable");

contract("Immutable", () => {
  specify("setUnsignedInt256 is write-once", async () => {
    const mock = await MockImmutable.deployed();
    await mock.setMockUnsignedInt256(100);
    assert.equal(await mock.getMockUnsignedInt256(), 100);
    try {
      await mock.setMockUnsignedInt256(100);
      assert(
        false,
        "setMockUnsignedInt256 should revert on second write"
      );
    } catch (error) {
      console.log(error.message);
      assert(error.message.includes("SHARE003"));
    }
  });

  specify("setAddress is write-once", async () => {
    const mock = await MockImmutable.deployed();
    await mock.setMockAddress(
      "0xD433e00E15aB2B2CBFb451a8E73946f14fD80B2C"
    );
    assert.equal(
      await mock.getMockAddress(),
      "0xD433e00E15aB2B2CBFb451a8E73946f14fD80B2C"
    );
    try {
      await mock.setMockAddress(
        "0x25D44C0476463Df171BE81e438312c3897d62c0B"
      );
      assert(false, "setAddress should revert on second write");
    } catch (error) {
      console.log(error.message);
      assert(error.message.includes("SHARE003"));
    }
  });

  specify("setBoolean is write-once", async () => {
    const mock = await MockImmutable.deployed();
    await mock.setMockBoolean(true);
    assert.equal(await mock.getMockBoolean(), true);
    try {
      await mock.setMockBoolean(false);
      assert(false, "setBoolean should revert on second write");
    } catch (error) {
      console.log(error.message);
      assert(error.message.includes("SHARE003"));
    }
  });

  specify("pushAddress is write-once after locked", async () => {
    const mock = await MockImmutable.deployed();
    await mock.pushToMockAddressArray(
      "0xD433e00E15aB2B2CBFb451a8E73946f14fD80B2C"
    );
    await mock.pushToMockAddressArray(
      "0x25D44C0476463Df171BE81e438312c3897d62c0B"
    );
    const arrayValues = await mock.getMockAddressArray();
    console.log(arrayValues);
    assert.deepEqual(arrayValues, [
      "0xD433e00E15aB2B2CBFb451a8E73946f14fD80B2C",
      "0x25D44C0476463Df171BE81e438312c3897d62c0B",
    ]);
    try {
      await mock.lockMockAddressArray();
      await mock.pushToMockAddressArray(
        "0x346fb69899304b2A85e5b36c9E0282b2d73454E7"
      );
      assert(
        false,
        "pushAddress should revert on second write after lock"
      );
    } catch (error) {
      console.log(error.message);
      assert(error.message.includes("SHARE003"));
    }
  });

  specify(
    "insertBooleanAtAddress is write-once after locked",
    async () => {
      const mock = await MockImmutable.deployed();
      await mock.insertIntoMockAddressToBooleanMap(
        "0xD433e00E15aB2B2CBFb451a8E73946f14fD80B2C",
        true
      );
      assert.equal(
        await mock.getMockAddressToBooeanMapValue(
          "0xD433e00E15aB2B2CBFb451a8E73946f14fD80B2C"
        ),
        true
      );
      assert.equal(
        await mock.getMockAddressToBooeanMapValue(
          "0x25D44C0476463Df171BE81e438312c3897d62c0B"
        ),
        false
      );

      try {
        await mock.lockMockAddressToBooleanMap();
        await mock.insertIntoMockAddressToBooleanMap(
          "0x25D44C0476463Df171BE81e438312c3897d62c0B",
          true
        );
        assert(
          false,
          "insertBooleanAtAddress should revert on second write after lock"
        );
      } catch (error) {
        console.log(error.message);
        assert(error.message.includes("SHARE003"));
      }
    }
  );
});
