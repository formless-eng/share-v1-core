# SHARE Contracts

## Documentation

- [SHARE Whitepaper](https://formless-eng.s3.us-east-2.amazonaws.com/share+whitepaper+7.pdf)
- Source level documentation is done in accordance with the Ethereum Natural Langauge Specification (<a href="https://docs.soliditylang.org/en/develop/natspec-format.html">NatSpec</a>).

## Engineering

We use Ganache for running a local blockchain:

1. Install truffle and ganache:

```
npm install -g truffle
```

```
npm install -g ganache-cli
```

2. Run local blockchain instance:

Modify `truffle-config.js` to enable the development stanza:

```
development: {
  host: "127.0.0.1",
  port: 8545,
  network_id: "*"
}
```

```
ganache-cli --defaultBalanceEther 10000
```

We recommend using tmux or a separate terminal for running ganache so that you can monitor logging in the console while also running additional commands to interact with the chain in a separate terminal window.

## Unit Tests

Unit tests for SHARE smart contracts are implemented using Truffle. To run them:

```shell
# Install Solidity dependencies specified in package.json
npm install

# Run smart contract unit tests using truffle
truffle test
```

## Error Codes

- `SHARE000` : `Licensing this PFA requires the keccak256 hash of runtime build code for the recipient address to map to an approved SHARE PFA collection build.`
- `SHARE001` : `Licensing this PFA requires the approved PFA collection build to include the address of this PFA in its revenue distribution address map, e.g. IPFCollection.contains must return true for the address of this asset.`
- `SHARE002` : `Owning this PFA requires that the owning address is an EOA, approved multisig wallet, or approved SHARE split contract.`
- `SHARE003` : `Immutable storage vars may only be set once. Attempt to write immutable variable.`
- `SHARE004` : `PFA units contain a single token at index 0.`
- `SHARE005` : `Incorrect price provided. Please use pricePerAccess method to determine correct value.`
- `SHARE006` : `Address table must have a number of entries less than or equal to the maximum number of shards specified by this contract.`
- `SHARE007` : `Addresses must be externally owned accounts, e.g. not contracts or multisig wallets.`
- `SHARE008` : `Address table must have a number of entries less than or equal to the maximum number of shards specified by this contract.`
- `SHARE009` : `PFA collections may only contain approved PFA builds.`
- `SHARE010` : `Use PFA collection price pricePerAccess to determine price. Attempted price is incorrect`.
- `SHARE011` : `Attempted access price is incorrect. Use grossPricePerAccess method to determine correct price in wei.`
- `SHARE012` : `Limited ownables may only be constructed using EOAs, not contracts.`
- `SHARE013` : `SHARE component protocol address must be initialized.`
- `SHARE014` : `This contract has not yet been initialized. Ensure initialize was called after the deployment.`
- `SHARE015` : `Collection price per access must be >= the maximum price of any one item in the collection.`
- `SHARE016` : `You must own this collection in order to license an asset to be included within it.`
- `SHARE017` : `Contract build type must be one of WALLET, SPLIT, PFA_UNIT or PFA_COLLECTION.`
- `SHARE018` : `This PFA does not support licensing.`
- `SHARE019` : `PFAs that support licensing must have immutable prices. This is because collections that have already licensed the PFA depend on a stable price to commit to in perpetuity.`
- `SHARE020` : `S2RD split contract must contain at least one address.`
- `SHARE021` : `Payment to asset owner unsuccessful. Please use an approved build which derives from LimitedOwnable.`
- `SHARE022` : `A PFA which does not support licensing was supplied to this collection.`
- `SHARE023` : `Incorrect licensing price provided. Please use pricePerLicense method to determine correct value.`
- `SHARE024` : `Attempted licensing price is incorrect. Use grossPricePerLicense method to determine correct price in wei.`
- `SHARE025` : `The supplied asset is not owned by this S2RD split and therefore cannot be reclaimed.`
- `SHARE026` : `A non-zero licensing price was supplied but this contract does not support licensing.`
- `SHARE027` : `Collection price per license must be >= the maximum license price of any one item in the collection.`

## Audits and Formal Verification

- Solidity Finance 4-30-2022 <a href="https://solidity.finance/">Scheduled.</a>

## Security and Liability

All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

## Licensing

- All files in `contracts` are unlicensed.
