const SHARE = artifacts.require("SHARE");
const PFAUnit = artifacts.require("PFAUnit");
const PFACollection = artifacts.require("PFACollection");
const S2RD = artifacts.require("S2RD");
const SL2RD = artifacts.require("SL2RD");
const SL2RD_V2 = artifacts.require("SL2RD_V2");
const OperatorRegistry = artifacts.require("OperatorRegistry");
const CodeVerification = artifacts.require("CodeVerification");
const Immutable = artifacts.require("Immutable");
const MockImmutable = artifacts.require("MockImmutable");
const MockPFARevertsOnAccess = artifacts.require("MockPFARevertsOnAccess");

module.exports = async (deployer) => {
  // Deploy library contracts
  await deployer.deploy(CodeVerification);
  await deployer.deploy(Immutable);
  await deployer.link(Immutable, MockImmutable);
  await deployer.deploy(MockImmutable);

  // Deploy SHARE protocol contract.
  await deployer.link(CodeVerification, SHARE);
  await deployer.deploy(SHARE);

  // Deploy PFAUnit (PFA implementation e.g. `G_NFT`) contract
  await deployer.link(Immutable, PFAUnit);
  await deployer.link(Immutable, MockPFARevertsOnAccess);
  await deployer.deploy(PFAUnit);
  await deployer.deploy(MockPFARevertsOnAccess);

  // Deploy S2RD royalty split contract.
  await deployer.link(Immutable, S2RD);
  await deployer.deploy(S2RD);

  // Deploy SL2RD royalty split contract.
  await deployer.link(Immutable, SL2RD);
  await deployer.deploy(SL2RD);

  // Deploy OperatorRegistry contract
  await deployer.deploy(OperatorRegistry);

  // Deploy PFACollection
  await deployer.link(Immutable, PFACollection);
  await deployer.deploy(PFACollection);

  // Deploy SL2RD_V2 contract
  await deployer.link(Immutable, SL2RD_V2);
  await deployer.deploy(SL2RD_V2);
};
