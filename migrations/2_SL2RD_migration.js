const SL2RD = artifacts.require("SL2RD");
const CodeVerification = artifacts.require("CodeVerification");
const Immutable = artifacts.require("Immutable");

module.exports = async (deployer) => {
    // Deploy library contracts
    await deployer.deploy(CodeVerification);
    await deployer.deploy(Immutable);
    
    // Deploy SL2RD royalty split contract.
    await deployer.link(Immutable, SL2RD);
    await deployer.deploy(SL2RD);
};
