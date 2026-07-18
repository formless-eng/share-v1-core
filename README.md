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
MNEMONIC_PHRASE=$MNEMONIC RPC_ENDPOINT_BASE_MAINNET=$RPC_ENDPOINT_BASE_MAINNET truffle console --network=base
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
- `SHARE043` : `Batch size must be greater than zero.`

- `SHARE044` : `Failed to approve ERC20 transfer to PFA contract.`
- `SHARE045` : `Failed to transfer ERC20 to PFA contract owner.`
- `SHARE046` : `Failed to execute call function on downstream payee address.`
- `SHARE047` : `Failed to transfer ERC20 to selected shareholder node.`
- `SHARE048` : `Failed to transfer ERC20 to recipient address.`
- `SHARE049` : `Failed to approve ERC20 transfer for callable contract.`
- `SHARE050` : `ERC20 allowance is insufficient to execute transfer.`
- `SHARE051` : `Value sent to contract must be zero when using ERC20.`
- `SHARE052` : `Failed to transfer ERC20 to distributor address.`
- `SHARE053` : `Slot index is out of bounds.`
- `SHARE054` : `Token ID does not exist.`
- `SHARE055` : `Distributor fee must be less than protocol fee.`
- `SHARE056` : `Cannot distribute ERC20 tokens to an empty address list.`
- `SHARE057` : `ERC20 funds per destination address must be greater than zero for distribution.`

## Distributing USDC funds to system wallets using operator registry

For example, sending $0.50 USDC to two wallets:

```bash
let registry = await OperatorRegistry.at("0x102Aa12FFAFaf805B690bb0b6aF2Ccd893113f07")
```

```bash
await registry.setERC20ContractAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")
```

```bash
let usdc = await BTERC20.at("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")
```

```bash
await usdc.approve("0x102Aa12FFAFaf805B690bb0b6aF2Ccd893113f07", 1000000)
```

```bash
await registry.fundAddressesUsingERC20Token(["0x1d767eCC99bE8cBD369c371e4f117385869Bf0E3", "0xA76c13f9513649838dFA56E7CbfaeA5f834Be09c"], 500000)
```

Funding 40 EOAs:

```bash
await registry.fundAddressesUsingERC20Token(["0x1d767eCC99bE8cBD369c371e4f117385869Bf0E3","0xA76c13f9513649838dFA56E7CbfaeA5f834Be09c","0x33dDF32Fa507ADF33f7Af907d8AC3b68692Ea67d","0xb899Cc123B9c95C7c2D765d570781A308f1B4c64","0x550eDad
06A1e8213bd055bAEBfB0A2b6aA91C770","0xAFCac89258727813cE0C9F7A9EC29faE1a4c0C69","0xcf013F37f430E72d89251E9AAE32fd1F59735677","0xbfE9b91D4C616f6cDfc1E9E81a80b67E51b619C7","0x79f030bFc21F990b0dF9c05737E91Fc84dade551","0x8854c37E09ec634E17c8B82Cc8DA1906
e0BAc5B9","0x656Ef7aA49c272538e0E2Db6504608188e57F051","0x9916F51B693a15CA813bb863ad0fB3B088D198Bd","0xbd8df6F6dA0062ff748Cf0b50083E0b3fa2C6924","0x41d8cC9F62b2Dc10A0657Ca50ab4f02C678E3eCb","0x0Aa8f9e90E975b5B4117aA81cE21b44Ef208EeED","0x3399654488BD
B2a66aaC1f790474edF7F0CD64aB","0x3d7aa751affDd14A2A1E247c66A0f419Ea7A097b","0x21676FE2cb6dDb5d6bDAFEea126f9eb7178E0670","0x9238A1f0547C017b85917ED6Be91545644A3c0DB","0x764E70f6BaaB11189BcB0b28F5a60e3Fc9f3a9a8","0x992aE282Ea8492e03282180988C545cB7934B
83e","0x187D00015AfFbb3b622815fC40321341cae95188","0x129A16f25dCc56E3bF1C238A6C8B569f85235af3","0x544274cDEF31290880697AD99012435C690BE3A7","0xaF25D061fCDbB8a4CC5e51395758A2D07d7127e4","0x625BFE6D45840C8E5478FF4a6638E1B70f89E0c2","0x77Fc73c48dAC08ae7
a48d6cB357A08B1905C7734","0xD62EDE6F4Bf725F9e30C74C649d507b419e6A93C","0xdAeCf480BeB27D47C9b3d2591b09d6824608f75b","0x3DDd9733bd976cDCebABD514A896214a6302D051","0xc45dD3220e652697bDeadf3e81CFa6a617c84170","0x17282F82402f8b417c4Ccb01F7c786C084DD5016",
"0x89D0A8a7FCA90580d9F0574b707E259B888972FE","0x1fA1CFDe8E00b77f95aEA900716f66326C172749","0xBDfc58d5B901C9331Be7b540A6B78Baf86A41df4","0x75721aE8d309C4d762a08c59a574F53e7eC28526","0xfda1477Cc4b5aB124acA73327F70cF73320caBEE","0x6bEb9acCBA9352949DFEA8
D52bdE24c430719c28","0x893419f7D0e21D55164df549a507164fb2483B29","0x336361C642f50e00548fBe97B0664F7Fc9E0b3C9"],2400000);
```

## Audits and Formal Verification

- Sourcehat <a href="https://sourcehat.com/audits/SHARE/">Audit</a> completed August 30, 2024. No external threats were identified.
- Solidity Finance <a href="https://solidity.finance/audits/SHARE/">Audit</a> completed May 23, 2022. No external threats were identified.

## Security and Liability

All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

## Licensing

- All files in `contracts` are unlicensed.
