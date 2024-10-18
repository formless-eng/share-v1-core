const SL2RD_V2 = artifacts.require("SL2RD_V2");
const CodeVerification = artifacts.require("CodeVerification");
const Immutable = artifacts.require("Immutable");

module.exports = async (deployer) => {
  // Deploy library contracts
  await deployer.deploy(CodeVerification);
  await deployer.deploy(Immutable);

  // Deploy SL2RD_V2
  await deployer.link(Immutable, SL2RD_V2);
  await deployer.link(CodeVerification, SL2RD_V2);
  await deployer.deploy(SL2RD_V2);
};
