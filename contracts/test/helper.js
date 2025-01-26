// Constants
const DEFAULT_ADDRESS_INDEX = 0;
const NON_OWNER_ADDRESS_INDEX = 1;
const UNIT_TOKEN_INDEX = 0;
const DEFAULT_TOKEN_ID = 0;
const GRANT_TTL_PRECISION_SEC = 5;
const LICENSE_TTL_PRECISION_SEC = 5;
const MAX_SL2RD_PARTITION_SIZE = 100;
const _PRIMARY_ACCOUNT_INDEX = 0;

/**
 * Pops an event in LIFO order from a list of events. Does not modify
 * the list.
 * @param {list} events A list of blockchain events.
 * @param {integer} indexIntoPast How far backward to go when popping
 * the event off of the LIFO stack.
 */
function popEventLIFO(events, indexIntoPast = 0) {
  return events[events.length - indexIntoPast - 1];
}

/**
 * Pops an event in FIFO order from a list of events. Does not modify
 * the list.
 * @param {list} events A list of blockchain events.
 * @param {integer} index How far forward to go when popping
 * the event off of the FIFO stack.
 */
function popEventFIFO(events, index = 0) {
  return events[index];
}

/**
 * Converts USDC to wei.
 * @param {integer} usdcAmount The amount of USDC to convert to wei.
 * @returns {integer} The amount of wei.
 */
function usdcToWei(usdcAmount) {
  return usdcAmount * 10 ** 6;
}

/**
 * Calculates the index of a split using a partition index.
 * @param {integer} partitionIndex The index of the partition.
 * @param {integer} partitionSize The size of the partition.
 * @param {integer} offset The offset of the split.
 * @returns {integer} The index of the split.
 */
function calculateSplitIndexUsingPartition(
  partitionIndex,
  partitionSize = MAX_SL2RD_PARTITION_SIZE,
  offset = 0
) {
  return partitionIndex * partitionSize + offset;
}

/**
 * Normalizes an address to lowercase.
 * @param {string} address The address to normalize.
 * @returns {string} The normalized address.
 */
function normalizeAddress(address) {
  return address.toLowerCase();
}

/**
 * Finds a node in a split contract.
 * @param {object} splitContract The split contract.
 * @param {string} address The address to find.
 * @returns {object} The node.
 */
async function findNode(splitContract, address) {
  let node = await splitContract.getShareholder(
    await splitContract.shareholdersRootNodeId()
  );
  while (node.next != "0x0000000000000000000000000000000000000000") {
    node = await splitContract.getShareholder(node.next);
    if (node.shareholderAddress === address) {
      return node;
    }
  }
  return null;
}

module.exports = {
  // Constants
  DEFAULT_ADDRESS_INDEX,
  NON_OWNER_ADDRESS_INDEX,
  UNIT_TOKEN_INDEX,
  DEFAULT_TOKEN_ID,
  GRANT_TTL_PRECISION_SEC,
  LICENSE_TTL_PRECISION_SEC,
  MAX_SL2RD_PARTITION_SIZE,
  _PRIMARY_ACCOUNT_INDEX,
  // Functions
  popEventLIFO,
  popEventFIFO,
  usdcToWei,
  calculateSplitIndexUsingPartition,
  normalizeAddress,
  findNode,
};
