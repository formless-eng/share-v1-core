const ExecutionVault = artifacts.require("ExecutionVault");

module.exports = async (deployer) => {
  await deployer.deploy(ExecutionVault);
};
