import { Contract, JsonRpcProvider, Log } from 'ethers';
import * as web3 from 'web3';
import { isArray, isObject } from 'class-validator';
import * as pancakeAbi from './abi.json';
import * as uniswapAbi from './uniswap.json';
import * as usdtAbi from './usdt.json';
import { TransactionItype } from '../../entities/onchain/transaction-onchain-history.entity';

/**
 * 验证交换路由的方向逻辑
 * 通过分析 amount0 和 amount1 的正负值来判断交易方向是否正确
 * @param swapChain 交换链数组
 * @returns 是否通过验证
 */
const validateSwapRoute = (swapChain: any[]): boolean => {
  if (swapChain.length === 0) {
    return false;
  }

  // 单步交换：检查 amount0 和 amount1 符号相反
  if (swapChain.length === 1) {
    const { amount0, amount1 } = swapChain[0];
    const amount0Num = BigInt(amount0);
    const amount1Num = BigInt(amount1);

    // 一个为正，一个为负
    return (
      (amount0Num > BigInt(0) && amount1Num < BigInt(0)) ||
      (amount0Num < BigInt(0) && amount1Num > BigInt(0))
    );
  }

  // 多步交换：验证整个路由链的方向
  for (let i = 0; i < swapChain.length; i++) {
    const { amount0, amount1 } = swapChain[i];
    const amount0Num = BigInt(amount0);
    const amount1Num = BigInt(amount1);

    // 每个交换步骤都应该有一个正数和一个负数
    if (
      !(
        (amount0Num > BigInt(0) && amount1Num < BigInt(0)) ||
        (amount0Num < BigInt(0) && amount1Num > BigInt(0))
      )
    ) {
      console.log(
        `Invalid amount signs at step ${i}: amount0=${amount0}, amount1=${amount1}`,
      );
      return false;
    }

    // 对于中间步骤，验证输入输出方向的一致性
    if (i > 0 && i < swapChain.length - 1) {
      const prevStep = swapChain[i - 1];
      const currentStep = swapChain[i];
      const nextStep = swapChain[i + 1];

      // 前一步的输出应该是当前步的输入
      // 当前步的输出应该是下一步的输入
      // 通过 token 匹配来验证
      if (
        prevStep.token1 !== currentStep.token0 ||
        currentStep.token1 !== nextStep.token0
      ) {
        console.log(`Token mismatch at step ${i}`);
        return false;
      }
    }
  }

  // 验证整体路由方向：分析第一个和最后一个步骤的符号
  const firstStep = swapChain[0];
  const lastStep = swapChain[swapChain.length - 1];

  const firstAmount0 = BigInt(firstStep.amount0);
  const firstAmount1 = BigInt(firstStep.amount1);
  const lastAmount0 = BigInt(lastStep.amount0);
  const lastAmount1 = BigInt(lastStep.amount1);

  // 对于多步交换，需要验证整个路由的一致性
  // 第一个步骤：用户应该有一个输入和一个输出
  // 最后一个步骤：用户应该有一个输入和一个输出
  // 中间步骤：每个步骤都应该有正确的符号组合

  // 检查第一个步骤：应该有一个正值和一个负值
  const firstHasPositive = firstAmount0 > BigInt(0) || firstAmount1 > BigInt(0);
  const firstHasNegative = firstAmount0 < BigInt(0) || firstAmount1 < BigInt(0);

  // 检查最后一个步骤：应该有一个正值和一个负值
  const lastHasPositive = lastAmount0 > BigInt(0) || lastAmount1 > BigInt(0);
  const lastHasNegative = lastAmount0 < BigInt(0) || lastAmount1 < BigInt(0);

  if (
    !firstHasPositive ||
    !firstHasNegative ||
    !lastHasPositive ||
    !lastHasNegative
  ) {
    console.log(
      `Invalid overall route direction: first amount0=${firstStep.amount0}, first amount1=${firstStep.amount1}, last amount0=${lastStep.amount0}, last amount1=${lastStep.amount1}`,
    );
    return false;
  }

  console.log('Route validation passed');
  return true;
};

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
  const swapChain = [];

  let transferCounts = 0;
  let transferParams = null;

  for (const log of logs) {
    if (
      log.topics.indexOf(
        '0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83',
      ) !== -1
    ) {
      abi = pancakeAbi;
      const contract = new Contract(log.address, abi, provider);
      const token0 = await contract.token0();
      const token1 = await contract.token1();
      const params = parseParams(log, abi);
      const amount0 = params.amount0;
      const amount1 = params.amount1;
      swapChain.push({
        token0,
        token1,
        amount0,
        amount1,
      });
      transferCounts = 40;
    } else if (
      log.topics.indexOf(
        '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67',
      ) !== -1
    ) {
      abi = uniswapAbi;

      const contract = new Contract(log.address, abi, provider);
      const token0 = await contract.token0();
      const token1 = await contract.token1();
      const params = parseParams(log, abi);
      const amount1 = params.amount1;
      const amount0 = params.amount0;
      swapChain.push({
        token0,
        token1,
        amount0,
        amount1,
      });
      transferCounts = 40;
    } else if (
      log.topics.indexOf(
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
      ) !== -1
    ) {
      transferCounts++;
      const params = parseParams(log, usdtAbi);
      transferParams = {
        from: params.from,
        to: params.to,
        value: params.value,
        type: TransactionItype.TOKEN_TRANSFER,
      };
    }
  }
  console.log('transferCounts: ', transferCounts);
  if (transferCounts === 1) {
    return transferParams;
  }

  if (!swapChain.length) {
    return null;
  }

  // 验证路由方向逻辑：通过正负值判断交易方向
  if (!validateSwapRoute(swapChain)) {
    console.log('Route validation failed');
    return null;
  }

  // 分析路由：找出整个路由的起始代币和最终代币
  const firstStep = swapChain[0];
  const lastStep = swapChain[swapChain.length - 1];

  // 输入：第一个步骤中正值的代币（用户得到的代币）
  let inputToken, inputAmount;
  if (BigInt(firstStep.amount0) > BigInt(0)) {
    inputToken = firstStep.token0;
    inputAmount = firstStep.amount0;
  } else {
    inputToken = firstStep.token1;
    inputAmount = firstStep.amount1;
  }

  // 输出：最后一个步骤中与输入代币不同的代币（最终得到的代币）
  let outputToken, outputAmount;
  if (lastStep.token0 !== inputToken) {
    outputToken = lastStep.token0;
    outputAmount = lastStep.amount0;
  } else {
    outputToken = lastStep.token1;
    outputAmount = lastStep.amount1;
  }

  console.log('Input token:', inputToken, 'Amount:', inputAmount);
  console.log('Output token:', outputToken, 'Amount:', outputAmount);

  return {
    inputToken,
    inputAmount,
    outputToken,
    outputAmount,
    type: TransactionItype.SWAP,
  };
};
