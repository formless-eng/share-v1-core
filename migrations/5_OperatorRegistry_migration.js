const OperatorRegistry = artifacts.require("OperatorRegistry");

module.exports = async (deployer) => {
  // Deploy OperatorRegistry
  await deployer.deploy(OperatorRegistry);
};
