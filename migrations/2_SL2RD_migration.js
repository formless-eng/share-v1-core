const SHARE = artifacts.require("SHARE");
const PFAUnit = artifacts.require("PFAUnit");
const PFACollection = artifacts.require("PFACollection");
const S2RD = artifacts.require("S2RD");
const SL2RD = artifacts.require("SL2RD");
const OperatorRegistry = artifacts.require("OperatorRegistry");
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
    
    // Deploy SL2RD royalty split contract.
    await deployer.link(Immutable, SL2RD);
    await deployer.deploy(SL2RD);
};
