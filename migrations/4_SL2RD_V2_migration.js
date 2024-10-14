const SL2RD_V2 = artifacts.require("SL2RD_V2");

module.exports = async (deployer) => {
  await deployer.deploy(SL2RD_V2);
};
