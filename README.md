# SHARE Contracts

## Documentation

- [SHARE Whitepaper](https://formless-eng.s3.us-east-2.amazonaws.com/share+whitepaper+7.pdf)
- Source level documentation is done in accordance with the Ethereum Natural Langauge Specification (<a href="https://docs.soliditylang.org/en/develop/natspec-format.html">NatSpec</a>).
- [docs.formless.xyz](https://docs.formless.xyz)

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
  network_id: "*",
  gas: 800000000,
}
```

```
ganache-cli --defaultBalanceEther 10000 -l 80000000000000 --accounts 21 -m "pave trigger reduce glass cram famous still web glare mechanic train next"
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

## Truffle interactive blockchain console

To interact with deployed contracts you can use the truffle console:

```
MNEMONIC_PHRASE=$MNEMONIC RPC_OPTIMISM_GOERLI=$RPC_OPTIMISM_GOERLI RPC_POLYGON_MUMBAI=$RPC_POLYGON_MUMBAI truffle console --network=mumbai
```

From the console you can then call "migrate" which will execute the code in `migrations/1_initial_migration.js` and deploy the respective contracts to the selected blockchain. From the console you can instantiate a reference to the contract using:

```javascript
let instance = await GNFT.at(
  "0xF3f95d49D5205d0aD811ebdadA1c106aef7D69f2"
);
```

```shell
truffle(mumbai)> instance.initialize("", "1000000000", 300)
```

```json
{
  "tx": "0xb7c1a87906db829cdc2b03b97dfd358b575aceb13cd16c823d2ffb5d98e3b135",
  "receipt": {
    "transactionHash": "0xb7c1a87906db829cdc2b03b97dfd358b575aceb13cd16c823d2ffb5d98e3b135",
    "blockHash": "0x930ac2506de1c8ad41f0f513e02fcea0fbcf4599650e0deaaf0982448a74b713",
    "blockNumber": 25890999,
    "contractAddress": null,
    "cumulativeGasUsed": 6593718,
    "effectiveGasPrice": "0x9ce41e76",
    "from": "0xd433e00e15ab2b2cbfb451a8e73946f14fd80b2c",
    "gasUsed": 72030,
    "logs": [],
    "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000408000000000000000000000000000000000000000000000000020000000800000000000000000000100000000004000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000080000000000000000000200000000000000000000000000000000000000000000000000000000000004000000000000000000001000000000000000000000000000008100040000000000000000000000000000000000000000000000000000000000000000000100000",
    "status": true,
    "to": "0xf3f95d49d5205d0ad811ebdada1c106aef7d69f2",
    "transactionIndex": 26,
    "type": "0x0",
    "rawLogs": [[Object]]
  },
  "logs": []
}
```

```shell
truffle(mumbai)> instance.setTokenURI("mock/token/uri")
```

```json
{
  "tx": "0x22f0b292c5efee71691ecee436dfea2019c886a7572fdbecb07b0f235400fcde",
  "receipt": {
    "transactionHash": "0x22f0b292c5efee71691ecee436dfea2019c886a7572fdbecb07b0f235400fcde",
    "blockHash": "0x03705345bb0c7879a9537d16f018d981b7e59909ac3060aed8bb956a542f8396",
    "blockNumber": 25891123,
    "contractAddress": null,
    "cumulativeGasUsed": 2911922,
    "effectiveGasPrice": "0x9280ac60",
    "from": "0xd433e00e15ab2b2cbfb451a8e73946f14fd80b2c",
    "gasUsed": 139992,
    "logs": [],
    "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000408000000000000000000000000000000000000000000000000020000000800000000000000000000100000000004000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000080000000000000000000200000000000000000000000000000000000000000000000000000000000004000000000000000000001000000000000000000000000000008100040000000000000000000000000000000000000000000000000000000000000000000100000",
    "status": true,
    "to": "0xf3f95d49d5205d0ad811ebdada1c106aef7d69f2",
    "transactionIndex": 20,
    "type": "0x0",
    "rawLogs": [[Object]]
  },
  "logs": []
}

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
- `SHARE027` : `Collection price per license must be >= the maximum license price of all items in the collection.`
- `SHARE028` : `The tokenId and addresses liquid split arrays must be the same length.`

## Audits and Formal Verification

- Solidity Finance <a href="https://solidity.finance/audits/SHARE/">Audit</a> completed. No external threats were identified.

## Security and Liability

All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

## Licensing

- All files in `contracts` are unlicensed.
```
