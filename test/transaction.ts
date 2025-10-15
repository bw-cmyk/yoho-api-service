import { Contract, JsonRpcProvider, Log } from 'ethers';
import * as web3 from 'web3';
import * as pancakeAbi from '../src/api-modules/assets/dex/bsc/abi.json';
import * as uniswapAbi from '../src/api-modules/assets/dex/bsc/uniswap.json';
import { isArray, isObject } from 'class-validator';

const provider = new JsonRpcProvider('https://bsc-dataseed.bnbchain.org');

const formatDecodedParams = (decodedParams: any): any => {
  const returnValues = Object.keys(decodedParams)
    .filter((key) => isNaN(key as any) && key !== '__length__')
    .reduce((obj, key) => {
      let value = decodedParams[key];
      if (isArray(value)) {
        value = value.map((v) => v.toString());
      } else if (isObject(value)) {
        value = formatDecodedParams(value);
      } else {
        value = value.toString();
      }
      return { ...obj, [key]: value };
    }, {});

  return returnValues;
};

const parseParams = (log: Log, abi: any) => {
  const events = abi.filter((e) => e.type === 'event' && e.anonymous === false);
  const signature = log.topics[0];
  const event = events.find(
    (e: any) => web3.eth.abi.encodeEventSignature(e) === signature,
  );

  if (!event) {
    throw Error('Cannot parse unknown event');
  }
  const rawReturnValues = web3.eth.abi.decodeLog(
    event.inputs,
    log.data,
    log.topics.slice(1),
  );
  return formatDecodedParams(rawReturnValues);
};

export const extractParamsFromTxByTopic = async (
  txHash: string,
  provider: JsonRpcProvider,
) => {
  const transaction = await provider.getTransactionReceipt(txHash);
  const logs = transaction.logs;

  let abi = null;
  let eventLog = null;

  for (const log of logs) {
    if (
      log.topics.indexOf(
        '0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83',
      ) !== -1
    ) {
      eventLog = log;
      abi = pancakeAbi;
    } else if (
      log.topics.indexOf(
        '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67',
      ) !== -1
    ) {
      eventLog = log;
      abi = uniswapAbi;
    }
  }

  if (!eventLog || !abi) {
    return null;
  }

  // get pair
  const contract = new Contract(eventLog.address, abi, provider);
  const token0 = await contract.token0();
  const token1 = await contract.token1();
  const params = parseParams(eventLog, abi);
  const amount0 = params.amount0;
  const amount1 = params.amount1;
  return {
    token0,
    token1,
    amount0,
    amount1,
  };
};
