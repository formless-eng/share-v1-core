# SHARE Protocol V1 Core Contracts

<a href="https://github.com/formless-eng/share-v1-core">https://github.com/formless-eng/share-v1-core</a>

## Documentation

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

## Running Individual Unit Tests

```shell
truffle test -g "License denial non-approved collection build"
```

## Truffle interactive blockchain console

To interact with deployed contracts you can use the truffle console:

```shell
MNEMONIC_PHRASE=$MNEMONIC RPC_ENDPIONT_OPTIMISM=$RPC_ENDPOINT_OPTIMISM RPC_ENDPOINT_POLYGON_MAINNET=$RPC_ENDPOINT_POLYGON_MAINNET truffle console --network=optimism
```

From the console you can then call "migrate" which will execute the code in `migrations/1_initial_migration.js` and deploy the respective contracts to the selected blockchain. From the console you can instantiate a reference to the contract using:

```javascript
truffle(optimism)> let share_instance = await SHARE.at("0x02C4C02247a7bEA0A27825FBE7a11B0C1eA5e7bc");

```

```shell
truffle(optimism)> share_instance.addApprovedBuild("0x0000000000000000000000000000000000000000000000000000000000000000", 0, "solc", "0.8.11+commit.d7f03943", "0x005D2246cE91890DbdeD3195a94095c560d5c363");
```

```json
{
  "tx": "0x238717f96f7687abf5fc770f7f129b3503d6986e8ab7ddd06617ba1182735ecd",
  "receipt": {
    "transactionHash": "0x238717f96f7687abf5fc770f7f129b3503d6986e8ab7ddd06617ba1182735ecd",
    "blockHash": "0x064327efbee848e67635108e6547d44d51c4a6b41c53eb8240185f584ab84584",
    "blockNumber": 12274171,
    "logs": [],
    "contractAddress": null,
    "effectiveGasPrice": 2500000050,
    "cumulativeGasUsed": 145299,
    "from": "0x005d2246ce91890dbded3195a94095c560d5c363",
    "gasUsed": 98398,
    "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "status": true,
    "to": "0x02c4c02247a7bea0a27825fbe7a11b0c1ea5e7bc",
    "transactionIndex": 1,
    "type": "0x2",
    "l1Fee": "0xd6b1ae67990",
    "l1FeeScalar": "1",
    "l1GasPrice": "0x996ac804",
    "l1GasUsed": "0x1664",
    "rawLogs": []
  },
  "logs": []
}
```

### Performing specific contract migrations using Truffle

```shell
MNEMONIC_PHRASE=$MNEMONIC RPC_ENDPOINT_POLYGON_MAINNET=$RPC_ENDPOINT_POLYGON_MAINNET GAS_VALUE=12000000 truffle console --network=polygon
```

```
migrate --f 2 --to 2
```

The command above deploys the contracts as specified in `2_SL2RD_migration.js`.

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
- `SHARE029` : `Community splits initialization percentage cannot exceed 10000 basis points (100%).`
- `SHARE030` : `Caller is not owner or operator.`
- `SHARE031` : `All community apportioned splits have been allocated.`
- `SHARE032` : `Only the contract owner or verified operator is allowed to transfer the slot.`
- `SHARE033` : `No funds provided for distribution.`
- `SHARE034` : `Cannot distribute funds to empty operator registry.`
- `SHARE035` : `The community reserved slot must currently be owned by initialization owner in order to have proper permissions to transfer to community member.`
- `SHARE036` : `Payment to operator address during funding operation unsuccessful.`
- `SHARE037` : `Transferring community allocated slots is prohibited until distribution process is complete.`
- `SHARE038` : `Partition size must be less than or equal to the maximum partition size specified by this contract.`
- `SHARE039` : `Access and license transactions may only be performed on approved contract builds.`
- `SHARE040` : `This contract has already been initialized.`
- `SHARE041` : `The sender of this transaction is not approved for transferring tokens from the specified address and cannot be automatically approved.`
- `SHARE042` : `The provided ERC20 contract address is invalid. Please provide a non-zero address.`

## Audits and Formal Verification

- Sourcehat <a href="https://sourcehat.com/audits/SHARE/">Audit</a> completed August 30, 2024. No external threats were identified.
- Solidity Finance <a href="https://solidity.finance/audits/SHARE/">Audit</a> completed May 23, 2022. No external threats were identified.

## Security and Liability

All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

## Licensing

- All files in `contracts` are unlicensed.
