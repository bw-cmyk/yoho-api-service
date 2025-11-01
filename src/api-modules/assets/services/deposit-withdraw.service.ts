import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Order } from '../entities/balance/order.entity';
import { DataSource, LessThan, Repository } from 'typeorm';
import { Wallet, JsonRpcProvider } from 'ethers';
import * as moment from 'moment';
import { formatUnits } from 'ethers';
import { Decimal } from 'decimal.js';
import redisClient from '../../../common-modules/redis/redis-client';
import { AssetService } from './asset.service';
import { Currency } from '../entities/balance/user-asset.entity';
import { UserService } from 'src/api-modules/user/service/user.service';
import { Contract } from 'ethers';
import * as paymentAbi from './payment.json';
import { Cron, CronExpression } from '@nestjs/schedule';

// removed unused abi

export const RPC = {
  56: 'https://bsc-mainnet.nodereal.io/v1/23c9bf70154c4c50bb759399e398b380',
  97: 'https://bsc-testnet.nodereal.io/v1/281d6c93805f4842b7e73a5906e35040',
  5611: 'https://opbnb-testnet.nodereal.io/v1/281d6c93805f4842b7e73a5906e35040',
  204: process.env.OPBNB_RPC
    ? process.env.OPBNB_RPC
    : 'https://opbnb-mainnet.nodereal.io/v1/d9e214aa832d49389e0da63ca2a30bd6',
  59144: 'https://rpc.linea.build',
  59140: 'https://linea-goerli.infura.io/v3/d0e4e07e9f814db0a5f4a50ee686af66',
  3441005: 'https://manta-testnet.calderachain.xyz/http',
  169: 'https://pacific-rpc.manta.network/http',
  167000: 'https://rpc.mainnet.taiko.xyz',
  7001: 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public',
  7000: 'https://zetachain-evm.blockpi.network/v1/rpc/public',
  42161: 'https://arb1.arbitrum.io/rpc',
  80001: 'https://polygon-mumbai.blockpi.network/v1/rpc/public',
  168587773: 'https://sepolia.blast.io',
  137: 'https://polygon-rpc.com/',
  81457: 'https://rpc.blast.io',
  9659: 'https://rpc-accused-coffee-koala-b9fn1dik76.t.conduit.xyz',
  1024: 'https://rpc.parallel.fi/',
};

const tokenMap = {
  97: {
    usdt: '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd',
    bnb: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  },
  56: {
    usdt: '0x55d398326f99059ff775485246999027b3197955',
    bnb: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  },
};

@Injectable()
export class DepositWithdrawService {
  private readonly logger = new Logger(DepositWithdrawService.name);
  private signer: Wallet = null;
  private provider: JsonRpcProvider = null;
  private isProcessing = false;

  constructor(
    private readonly configService: ConfigService,

    private readonly assetService: AssetService,

    private readonly userService: UserService,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    const MINT_PRIVATE_KEY = this.configService.get(
      'SIGNED_PAYMENT_PRIVATE_KEY',
    );
    this.signer = new Wallet(MINT_PRIVATE_KEY);
    this.provider = new JsonRpcProvider(RPC[56]);
  }

  public async getOrders(
    uid: string,
    limit = 20,
    offset = 0,
  ): Promise<Order[]> {
    const orders = await this.orderRepository.find({
      where: {
        uid: uid,
      },
      skip: offset,
      take: limit,
    });
    return orders;
  }

  public async getWithDrawSignature(
    amount: string,
    uid: string,
    chainId: number,
    type: string,
    orderId: number,
    notifyUrl: string,
  ) {
    const user = await this.userService.getUser(uid);
    if (!user) {
      throw new BadRequestException('user not found');
    }
    const wallet = user.evmAAWallet;

    if (orderId) {
      const exists = await this.orderRepository.findOne({
        where: {
          orderId: orderId,
        },
      });
      if (exists) {
        // Only approved orders can get signature
        if (exists.status === 'approved') {
          exists.expireAt = moment().add(5, 'minute').unix();
          await this.orderRepository.save(exists);
          return await this.signWithDrawMessage(exists);
        }

        // Not approved yet, return order info only
        return {
          orderId: exists.orderId,
          status: exists.status,
          expireAt: exists.expireAt,
        } as any;
      }
    }

    const tokenAddress = tokenMap[chainId]?.[type];

    if (!tokenAddress) {
      throw new BadRequestException('token not found');
    }

    try {
      await this.assetService.lockBalance(
        uid,
        Currency.USD,
        new Decimal(formatUnits(amount, 18)),
        `withdraw-${orderId}`,
      );
    } catch (error) {
      console.log('error', error);
      throw new BadRequestException('Lock balance failed');
    }
    const order = await this.createOrder(
      uid,
      wallet,
      amount,
      chainId,
      tokenAddress,
      notifyUrl || process.env.MEME_WAR_WITHDRAW_URL,
      'withdraw',
    );

    // Withdraw requires manual approval first
    return {
      orderId: order.orderId,
      status: order.status,
      expireAt: order.expireAt,
    } as any;
  }

  public async getTopUpSignature(
    amount: string,
    uid: string,
    chainId: number,
    type: string,
    orderId: number,
    notifyUrl: string,
  ) {
    const user = await this.userService.getUser(uid);
    if (!user) {
      throw new BadRequestException('user not found');
    }
    const wallet = user.evmAAWallet;

    if (orderId) {
      const exists = await this.orderRepository.findOne({
        where: {
          orderId: orderId,
        },
      });
      if (exists) {
        exists.expireAt = moment().add(5, 'minute').unix();
        await this.orderRepository.save(exists);
        return this.signPaymentMessage(exists);
      }
    }

    const tokenAddress = tokenMap[chainId]?.[type];

    if (!tokenAddress) {
      throw new BadRequestException('token not found');
    }
    const order = await this.createOrder(
      uid,
      wallet,
      amount,
      chainId,
      tokenAddress,
      notifyUrl || process.env.MEME_WAR_DEPOSIT_URL,
      'deposit',
    );
    return this.signPaymentMessage(order);
  }

  public async updateOrderStatus(orderId: number) {
    const startTime = Date.now();
    this.logger.log(`Starting to process order ${orderId}`);
    // 使用分布式锁防止并发处理
    const lockKey = `deposit-order-${orderId}`;
    const lockResult = await this.getLock(lockKey);

    if (!lockResult) {
      this.logger.warn(
        `Order ${orderId} is already being processed by another instance`,
      );
      return;
    }

    try {
      const order = await this.orderRepository.findOne({
        where: {
          id: orderId,
        },
      });

      this.logger.log(`Processing order ${orderId}:`, order);

      if (!order) {
        this.logger.warn(`Order ${orderId} not found`);
        return;
      }

      if (order.processed) {
        this.logger.log(`Order ${orderId} already processed`);
        return;
      }

      // 使用数据库事务确保原子性
      await this.dataSource.transaction(async (manager) => {
        // 重新查询订单以确保数据一致性，使用悲观锁
        const currentOrder = await manager.findOne(Order, {
          where: { id: orderId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!currentOrder) {
          this.logger.warn(`Order ${orderId} not found in transaction`);
          return;
        }

        if (currentOrder.processed) {
          this.logger.log(`Order ${orderId} already processed in transaction`);
          return;
        }

        const params = {
          chainId: currentOrder.chainId,
          amount: parseFloat(formatUnits(currentOrder.amount.toString(), 18)),
          tokenAddress: currentOrder.currency,
          orderId: currentOrder.orderId,
          wallet: currentOrder.wallet,
          deadline: currentOrder.expireAt,
          uid: currentOrder.uid,
        };

        try {
          // 处理用户余额更新
          await this.processUserBalanceUpdate(currentOrder, params);
        } catch (e) {
          this.logger.error(
            `Failed to update user balance for order ${orderId}:`,
            e,
          );
          throw e;
        }

        // 标记订单为已处理
        currentOrder.processed = true;
        currentOrder.status = 'finish';
        await manager.save(currentOrder);

        this.logger.log(`Order ${orderId} processed successfully`);
      });

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Order ${orderId} processing completed in ${processingTime}ms`,
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `Failed to process order ${orderId} after ${processingTime}ms:`,
        error,
      );
      throw error;
    } finally {
      // 释放锁
      await this.releaseLock(lockKey);
    }
  }

  private async createOrder(
    uid: string,
    address: string,
    amount: string,
    chainId: number,
    currency: string,
    notifyUrl: string,
    type: 'deposit' | 'withdraw',
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const order = new Order();
      order.uid = uid;
      order.wallet = address;
      order.amount = amount;
      order.chainId = chainId;
      order.currency = currency;
      order.notifyUrl = notifyUrl;
      order.processed = false;
      order.type = type;
      order.timestamp = moment().unix();
      order.expireAt = moment().add(5, 'minute').unix();
      // withdraw requires approval, deposit can be immediate
      order.status = 'pending';

      const ticketInDb = await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();
      return ticketInDb;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  private async signPaymentMessage(order: Order) {
    const SIGNED_PAYMENT_CONTRACT = this.configService.get(
      'SIGNED_PAYMENT_CONTRACT',
    );

    const params = {
      systemId: order.orderId,
      orderId: order.orderId,
      deadline: order.expireAt,
      user: order.wallet,
      token: order.currency,
      amount: order.amount,
    };

    console.log('params', params);
    const signature = await this.signer.signTypedData(
      {
        name: 'SignedPayment',
        version: '1',
        chainId: order.chainId,
        verifyingContract: SIGNED_PAYMENT_CONTRACT,
      },
      {
        Deposit: [
          { name: 'systemId', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'user', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
      },
      params,
    );

    return {
      signature: signature,
      contract: SIGNED_PAYMENT_CONTRACT,
      ...params,
    };
  }

  private async signWithDrawMessage(order: Order) {
    if (order.status !== 'approved') {
      throw new BadRequestException('withdraw order not approved');
    }
    const SIGNED_PAYMENT_CONTRACT = this.configService.get(
      'SIGNED_PAYMENT_CONTRACT',
    );

    const params = {
      systemId: order.orderId,
      orderId: order.orderId,
      deadline: order.expireAt,
      user: order.wallet,
      token: order.currency,
      amount: order.amount,
    };

    const signature = await this.signer.signTypedData(
      {
        name: 'SignedPayment',
        version: '1',
        chainId: order.chainId,
        verifyingContract: SIGNED_PAYMENT_CONTRACT,
      },
      {
        Withdraw: [
          { name: 'systemId', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'user', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
      },
      params,
    );

    return {
      signature: signature,
      contract: SIGNED_PAYMENT_CONTRACT,
      ...params,
    };
  }

  public async approveWithdraw(orderId: number) {
    const order = await this.orderRepository.findOne({ where: { orderId } });
    if (!order) {
      throw new BadRequestException('order not found');
    }
    if (order.type !== 'withdraw') {
      throw new BadRequestException('only withdraw can be approved');
    }
    if (order.status === 'cancel') {
      throw new BadRequestException('order already cancelled');
    }
    if (order.status === 'finish') {
      throw new BadRequestException('order already finished');
    }
    order.status = 'approved';
    await this.orderRepository.save(order);
    return { orderId: order.orderId, status: order.status };
  }

  public async rejectWithdraw(orderId: number) {
    const order = await this.orderRepository.findOne({ where: { orderId } });
    if (!order) {
      throw new BadRequestException('order not found');
    }
    if (order.type !== 'withdraw') {
      throw new BadRequestException('only withdraw can be rejected');
    }
    if (order.status === 'cancel') {
      return { orderId: order.orderId, status: order.status };
    }
    if (order.status === 'finish') {
      throw new BadRequestException('order already finished');
    }

    // unlock locked balance
    try {
      await this.assetService.unlockBalance(
        order.uid,
        Currency.USD,
        new Decimal(formatUnits(order.amount.toString(), 18)),
        `withdraw-${order.orderId}`,
      );
    } catch (e) {
      this.logger.error('unlock balance failed for reject', e);
    }

    order.status = 'cancel';
    await this.orderRepository.save(order);
    return { orderId: order.orderId, status: order.status };
  }

  async getLock(lockKey: string, ttl = 30) {
    return new Promise((resolve, reject) => {
      redisClient.set(lockKey, 'locked', 'EX', ttl, 'NX', (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result === 'OK');
      });
    });
  }

  async releaseLock(lockKey: string) {
    return new Promise((resolve, reject) => {
      redisClient.del(lockKey, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  }

  private async processUserBalanceUpdate(order: Order, params: any) {
    try {
      // 根据订单类型处理用户余额
      if (order.type === 'deposit') {
        await this.assetService.deposit({
          userId: order.uid,
          currency: Currency.USD,
          amount: new Decimal(params.amount),
          reference_id: `deposit-${order.orderId}`,
          description: `Deposit from order ${order.orderId}`,
          metadata: {
            orderId: order.orderId,
            chainId: order.chainId,
            wallet: order.wallet,
            tokenAddress: order.currency,
          },
        });
      } else if (order.type === 'withdraw') {
        // 处理提现逻辑
        await this.assetService.withdraw({
          userId: order.uid,
          currency: Currency.USD,
          amount: new Decimal(params.amount),
          reference_id: `withdraw-${order.orderId}`,
          description: `Withdraw from order ${order.orderId}`,
          metadata: {
            orderId: order.orderId,
            chainId: order.chainId,
            wallet: order.wallet,
            tokenAddress: order.currency,
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to process user balance update for order ${order.orderId}:`,
        error,
      );
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  public async processExpiredOrders() {
    if (this.isProcessing) {
      return;
    }
    try {
      this.isProcessing = true;
      const expiredOrders = await this.orderRepository.find({
        where: {
          expireAt: LessThan(moment().unix()),
          status: 'pending',
        },
        take: 10,
        order: {
          expireAt: 'ASC',
        },
      });
      for (const order of expiredOrders) {
        await this.processExpiredOrder(order);
      }
    } catch (error) {
      this.logger.error('Failed to process expired orders:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processExpiredOrder(order: Order) {
    // find order on chain
    const contract = new Contract(
      process.env.SIGNED_PAYMENT_CONTRACT,
      paymentAbi,
      this.provider,
    );
    const orderData = await contract.usedSystemIds(order.orderId);
    if (orderData === false) {
      order.status = 'cancel';
      if (order.type === 'withdraw') {
        await this.assetService.unlockBalance(
          order.uid,
          Currency.USD,
          new Decimal(formatUnits(order.amount.toString(), 18)),
          `withdraw-${order.orderId}`,
        );
      }
      await this.orderRepository.save(order);
    }
  }
}
