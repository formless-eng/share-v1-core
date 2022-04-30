const SHARE = artifacts.require("SHARE");
const PFAUnit = artifacts.require("PFAUnit");
const PFACollection = artifacts.require("PFACollection");
const S2RD = artifacts.require("S2RD");
const CodeVerification = artifacts.require("CodeVerification");
const Immutable = artifacts.require("Immutable");
const MockImmutable = artifacts.require("MockImmutable");
const MockPFARevertsOnAccess = artifacts.require(
  "MockPFARevertsOnAccess"
);

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

  // Deploy PFACollection
  await deployer.link(Immutable, PFACollection);
  await deployer.deploy(PFACollection);
};
