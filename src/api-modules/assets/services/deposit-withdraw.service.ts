// import { BadRequestException, Injectable, Logger } from '@nestjs/common';
// import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
// import { ConfigService } from '@nestjs/config';
// import { Order } from '../entities/balance/order.entity';
// import { DataSource, LessThan, Repository } from 'typeorm';
// import { Contract, Wallet, ethers, JsonRpcProvider, parseUnits } from 'ethers';
// import * as moment from 'moment';
// import axios from 'axios';
// import { createHash } from 'node:crypto';
// import { formatUnits, getAddress, Interface } from 'ethers';
// import redisClient from '../../redis';

// const abi = [
//   {
//     inputs: [
//       {
//         internalType: 'uint256',
//         name: '',
//         type: 'uint256',
//       },
//     ],
//     name: 'usedSystemIds',
//     outputs: [
//       {
//         internalType: 'bool',
//         name: '',
//         type: 'bool',
//       },
//     ],
//     stateMutability: 'view',
//     type: 'function',
//   },
// ];

// export const RPC = {
//   56: 'https://bsc-mainnet.nodereal.io/v1/23c9bf70154c4c50bb759399e398b380',
//   97: 'https://bsc-testnet.nodereal.io/v1/281d6c93805f4842b7e73a5906e35040',
//   5611: 'https://opbnb-testnet.nodereal.io/v1/281d6c93805f4842b7e73a5906e35040',
//   204: process.env.OPBNB_RPC
//     ? process.env.OPBNB_RPC
//     : 'https://opbnb-mainnet.nodereal.io/v1/d9e214aa832d49389e0da63ca2a30bd6',
//   59144: 'https://rpc.linea.build',
//   59140: 'https://linea-goerli.infura.io/v3/d0e4e07e9f814db0a5f4a50ee686af66',
//   3441005: 'https://manta-testnet.calderachain.xyz/http',
//   169: 'https://pacific-rpc.manta.network/http',
//   167000: 'https://rpc.mainnet.taiko.xyz',
//   7001: 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public',
//   7000: 'https://zetachain-evm.blockpi.network/v1/rpc/public',
//   42161: 'https://arb1.arbitrum.io/rpc',
//   80001: 'https://polygon-mumbai.blockpi.network/v1/rpc/public',
//   168587773: 'https://sepolia.blast.io',
//   137: 'https://polygon-rpc.com/',
//   81457: 'https://rpc.blast.io',
//   9659: 'https://rpc-accused-coffee-koala-b9fn1dik76.t.conduit.xyz',
//   1024: 'https://rpc.parallel.fi/',
// };

// const tokenMap = {
//   97: {
//     usdt: '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd',
//     bnb: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
//   },
//   56: {
//     usdt: '0x55d398326f99059ff775485246999027b3197955',
//     bnb: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
//   },
// };

// const decimals = {
//   97: {
//     usdt: 18,
//   },
//   56: {
//     usdt: 18,
//   },
// };

// @Injectable()
// export class PaymentService {
//   private readonly logger = new Logger(PaymentService.name);
//   private signer: Wallet = null;
//   private provider: JsonRpcProvider = null;

//   constructor(
//     private readonly configService: ConfigService,

//     @InjectRepository(Order)
//     private readonly orderRepository: Repository<Order>,

//     @InjectDataSource()
//     private readonly dataSource: DataSource,
//   ) {
//     const MINT_PRIVATE_KEY = this.configService.get(
//       'SIGNED_PAYMENT_PRIVATE_KEY',
//     );
//     this.signer = new Wallet(MINT_PRIVATE_KEY);
//   }

//   public async getBalance(address: string, chainId: number, token: string) {
//     const provider = new JsonRpcProvider(RPC[chainId]);
//     const tokenAddress = tokenMap[chainId]?.[token];
//     if (!tokenAddress) {
//       throw new BadRequestException('token not found');
//     }
//     const contract = new Contract(
//       tokenAddress,
//       ['function balanceOf(address) view returns (uint256)'],
//       provider,
//     );
//     const balance = await contract.balanceOf(address);

//     return {
//       balance: parseFloat(formatUnits(balance, decimals[chainId][token])),
//       balanceRaw: balance.toString(),
//     };
//   }

//   public async checkDepositUsdt(txHash: string, chainId: number) {
//     const provider = new JsonRpcProvider(RPC[chainId]);

//     const exists = await this.orderRepository.findOne({
//       where: {
//         customerOrderId: txHash,
//       },
//     });

//     if (exists) {
//       return {
//         clientId: exists.uid,
//         wallet: exists.wallet,
//         amount: exists.amount,
//         chainId: exists.chainId,
//         customerOrderId: exists.customerOrderId,
//         processed: exists.processed,
//         status: 'success',
//       };
//     }

//     try {
//       const tx = await provider.getTransaction(txHash);
//       const tokenAddress = tokenMap[chainId]?.['usdt'];
//       // check tx.to
//       if (tx && tx.to === getAddress(tokenAddress)) {
//         // check tx.logs
//         const data = new Interface([
//           'function transfer(address recipient, uint256 amount)',
//         ]).decodeFunctionData('transfer', tx.data);

//         const SIGNED_PAYMENT_CONTRACT = this.configService.get(
//           'SIGNED_PAYMENT_CONTRACT',
//         );

//         if (SIGNED_PAYMENT_CONTRACT === data[0]) {
//           const usdt = parseFloat(formatUnits(data[1], 18));

//           const lock = await this.getLock(txHash);
//           if (lock !== 'OK') {
//             throw new BadRequestException(
//               'Transaction is checking, please wait for 5 seconds',
//             );
//           }
//           const order = new Order();
//           order.wallet = tx.from;
//           order.amount = data[1].toString();
//           order.chainId = chainId;
//           order.currency = tokenAddress;
//           order.notifyUrl = '';
//           order.processed = false;
//           order.type = 'deposit-transfer';
//           order.customerOrderId = txHash;
//           order.processed = true;
//           order.timestamp = moment().unix();
//           order.expireAt = 0;
//           await this.orderRepository.save(order);
//           return {
//             clientId: order.uid,
//             wallet: order.wallet,
//             amount: order.amount,
//             chainId: order.chainId,
//             customerOrderId: order.customerOrderId,
//             processed: order.processed,
//             status: 'success',
//           };
//         } else {
//           throw new BadRequestException('Invalid Transaction');
//         }
//       } else {
//         throw new BadRequestException('Invalid Transaction, USDT only');
//       }
//     } catch (e) {
//       if (e instanceof BadRequestException) {
//         throw e;
//       }
//       throw new BadRequestException('Invalid Transaction');
//     }
//   }

//   public async getOrderStatus(
//     orderId: number,
//     timestamp: number,
//     signature: string,
//   ) {
//     const order = await this.orderRepository.findOne({
//       where: {
//         orderId: orderId,
//       },
//     });

//     const params = {
//       orderId,
//       timestamp,
//     };

//     if (timestamp + 5000 < moment().unix() && timestamp) {
//       throw new BadRequestException('order expired');
//     }

//     const checkedSignature = this.getSign(
//       params,
//       'aEOZXSOVL-9-of2_t0Qgfw8QhA9a7GXkYVGUiaBthME',
//     );
//     if (signature !== checkedSignature) {
//       throw new BadRequestException('signature error');
//     }

//     if (!order) {
//       throw new BadRequestException('order not found');
//     }

//     if (order.processed) {
//       return {
//         clientId: order.uid,
//         wallet: order.wallet,
//         amount: order.amount,
//         chainId: order.chainId,
//         customerOrderId: order.customerOrderId,
//         processed: order.processed,
//         status: 'success',
//       };
//     }

//     const provider = new JsonRpcProvider(RPC[order.chainId]);

//     const SIGNED_PAYMENT_CONTRACT = this.configService.get(
//       'SIGNED_PAYMENT_CONTRACT',
//     );

//     const nftContractReadonly = new Contract(
//       SIGNED_PAYMENT_CONTRACT,
//       abi,
//       provider,
//     );
//     let status = 'pending';
//     try {
//       const result = await nftContractReadonly.usedSystemIds(orderId);
//       if (result) {
//         order.processed = true;
//         await this.orderRepository.save(order);
//       }
//     } catch (e) {
//       throw new BadRequestException('Check Failed');
//     }

//     const blockNumber = await provider.getBlockNumber();
//     const block = await provider.getBlock(blockNumber);
//     if (order.processed) {
//       status = 'success';
//     } else if (order.expireAt < block.timestamp) {
//       status = 'failed';
//     }

//     return {
//       clientId: order.uid,
//       wallet: order.wallet,
//       amount: order.amount,
//       chainId: order.chainId,
//       customerOrderId: order.customerOrderId,
//       processed: order.processed,
//       status,
//     };
//   }

//   public async getWithDrawSignature(
//     amount: string,
//     wallet: string,
//     chainId: number,
//     type: string,
//     customerOrderId: string,
//     notifyUrl: string,
//   ) {
//     const exists = await this.orderRepository.findOne({
//       where: {
//         customerOrderId: customerOrderId,
//       },
//     });

//     if (exists) {
//       exists.expireAt = moment().add(5, 'minute').unix();
//       await this.orderRepository.save(exists);
//       return await this.signWithDrawMessage(exists);
//     }

//     const tokenAddress = tokenMap[chainId]?.[type];

//     if (!tokenAddress) {
//       throw new BadRequestException('token not found');
//     }

//     const order = await this.createOrder(
//       wallet,
//       amount,
//       chainId,
//       tokenAddress,
//       customerOrderId,
//       notifyUrl || process.env.MEME_WAR_WITHDRAW_URL,
//       'withdraw',
//     );

//     return this.signWithDrawMessage(order);
//   }

//   public async getTopUpSignature(
//     amount: string,
//     wallet: string,
//     chainId: number,
//     type: string,
//     customerOrderId: string,
//     notifyUrl: string,
//   ) {
//     const exists = await this.orderRepository.findOne({
//       where: {
//         customerOrderId: customerOrderId,
//       },
//     });

//     if (exists) {
//       exists.expireAt = moment().add(5, 'minute').unix();
//       await this.orderRepository.save(exists);
//       return this.signPaymentMessage(exists);
//     }

//     const tokenAddress = tokenMap[chainId]?.[type];

//     if (!tokenAddress) {
//       throw new BadRequestException('token not found');
//     }

//     const order = await this.createOrder(
//       wallet,
//       amount,
//       chainId,
//       tokenAddress,
//       customerOrderId,
//       notifyUrl || process.env.MEME_WAR_DEPOSIT_URL,
//       'deposit',
//     );
//     return this.signPaymentMessage(order);
//   }

//   public async updateOrderStatus(orderId: number) {
//     const order = await this.orderRepository.findOne({
//       where: {
//         id: orderId,
//       },
//     });
//     console.log('updateOrderStatus', orderId, order);
//     if (!order || order.processed) {
//       return;
//     }

//     const params = {
//       chainId: order.chainId,
//       amount: parseFloat(formatUnits(order.amount.toString(), 18)),
//       tokenAddress: order.currency, // 代币地址
//       customerOrderId: order.customerOrderId,
//       orderId: order.orderId,
//       wallet: order.wallet,
//       deadline: order.expireAt,
//       clientId: order.uid,
//     };

//     try {
//       const url = order.notifyUrl;
//       const resp = await axios.post(
//         url,
//         {
//           ...params,
//         },
//         {
//           headers: {
//             'Content-Type': 'application/json',
//             'x-api-key': '8cqnuHg4Gpadnvp{',
//           },
//         },
//       );
//       console.log(resp.data);
//     } catch (e) {
//       const url = order.notifyUrl;
//       const resp = await axios.post(
//         url,
//         {
//           ...params,
//         },
//         {
//           headers: {
//             'x-api-key': '8cqnuHg4Gpadnvp{',
//             'Content-Type': 'application/json',
//           },
//         },
//       );
//       console.log(resp.data);
//       console.error(e);
//     }

//     order.processed = true;
//     await this.orderRepository.save(order);
//   }

//   private async createOrder(
//     address: string,
//     amount: string,
//     chainId: number,
//     currency: string,
//     customerOrderId: string,
//     notifyUrl: string,
//     type: 'deposit' | 'withdraw',
//   ) {
//     const queryRunner = this.dataSource.createQueryRunner();
//     await queryRunner.connect();
//     await queryRunner.startTransaction();
//     try {
//       const order = new Order();
//       order.wallet = address;
//       order.amount = amount;
//       order.chainId = chainId;
//       order.currency = currency;
//       order.notifyUrl = notifyUrl;
//       order.processed = false;
//       order.type = type;
//       order.customerOrderId = customerOrderId;
//       order.timestamp = moment().unix();
//       order.expireAt = moment().add(5, 'minute').unix();

//       const ticketInDb = await queryRunner.manager.save(order);

//       await queryRunner.commitTransaction();
//       return ticketInDb;
//     } catch (e) {
//       await queryRunner.rollbackTransaction();
//       throw e;
//     } finally {
//       await queryRunner.release();
//     }
//   }

//   private async signPaymentMessage(order: Order) {
//     const SIGNED_PAYMENT_CONTRACT = this.configService.get(
//       'SIGNED_PAYMENT_CONTRACT',
//     );

//     const params = {
//       systemId: order.orderId,
//       orderId: order.orderId,
//       deadline: order.expireAt,
//       user: order.wallet,
//       token: order.currency,
//       amount: order.amount,
//     };

//     console.log(params);

//     const signature = await this.signer.signTypedData(
//       {
//         name: 'SignedPayment',
//         version: '1',
//         chainId: order.chainId,
//         verifyingContract: SIGNED_PAYMENT_CONTRACT,
//       },
//       {
//         Deposit: [
//           { name: 'systemId', type: 'uint256' },
//           { name: 'deadline', type: 'uint256' },
//           { name: 'user', type: 'address' },
//           { name: 'token', type: 'address' },
//           { name: 'amount', type: 'uint256' },
//         ],
//       },
//       params,
//     );

//     return {
//       signature: signature,
//       contract: SIGNED_PAYMENT_CONTRACT,
//       ...params,
//     };
//   }

//   private async signWithDrawMessage(order: Order) {
//     const SIGNED_PAYMENT_CONTRACT = this.configService.get(
//       'SIGNED_PAYMENT_CONTRACT',
//     );

//     const params = {
//       systemId: order.orderId,
//       orderId: order.orderId,
//       deadline: order.expireAt,
//       user: order.wallet,
//       token: order.currency,
//       amount: order.amount,
//     };

//     const signature = await this.signer.signTypedData(
//       {
//         name: 'SignedPayment',
//         version: '1',
//         chainId: order.chainId,
//         verifyingContract: SIGNED_PAYMENT_CONTRACT,
//       },
//       {
//         Withdraw: [
//           { name: 'systemId', type: 'uint256' },
//           { name: 'deadline', type: 'uint256' },
//           { name: 'user', type: 'address' },
//           { name: 'token', type: 'address' },
//           { name: 'amount', type: 'uint256' },
//         ],
//       },
//       params,
//     );

//     return {
//       signature: signature,
//       contract: SIGNED_PAYMENT_CONTRACT,
//       ...params,
//     };
//   }

//   private getSign(params: any, secret: string) {
//     const data = {
//       ...params,
//     };

//     delete data.sign;

//     const paramSignData = Object.keys(params)
//       .sort()
//       .filter(
//         (k) => params[k] !== '' || params !== null || params !== undefined,
//       )
//       .map((k) => `${k}=${params[k]}`)
//       .join('&');
//     return createHash('md5').update(`${paramSignData}${secret}`).digest('hex');
//   }

//   async getLock(address: string) {
//     return new Promise((resolve, reject) => {
//       redisClient.set(
//         `assets-user-deposit-${address}`,
//         address,
//         'EX',
//         5,
//         'NX',
//         (err, result) => {
//           if (err) {
//             reject(err);
//             return;
//           }
//           resolve(result);
//         },
//       );
//     });
//   }
// }
