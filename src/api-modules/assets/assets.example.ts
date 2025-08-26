import { Injectable } from '@nestjs/common';
import { AssetService } from './services/asset.service';
import { Currency } from './entities/user-asset.entity';
import { Decimal } from 'decimal.js';

@Injectable()
export class AssetsExampleService {
  constructor(private readonly assetService: AssetService) {}

  /**
   * 示例：完整的用户资金流转流程
   */
  async exampleCompleteFlow() {
    const userId = 12345;
    const currency = Currency.USDT;

    console.log('=== 资产管理系统示例 ===');

    // 1. 用户充值
    console.log('\n1. 用户充值');
    const depositResult = await this.assetService.deposit({
      user_id: userId,
      currency,
      amount: new Decimal('100'),
      reference_id: 'DEPOSIT_001',
      description: '用户充值100 USDT',
    });

    console.log('充值后资产:', depositResult.asset.getBalanceDetails());
    console.log(
      '充值交易:',
      depositResult.transactions.map((t) => t.getSummary()),
    );

    // 2. 游戏下注
    console.log('\n2. 游戏下注');
    const betResult = await this.assetService.bet({
      user_id: userId,
      currency,
      amount: new Decimal('50'),
      game_id: 'GAME_001',
      description: '老虎机游戏下注',
    });

    console.log('下注后资产:', betResult.asset.getBalanceDetails());
    console.log('下注交易:', betResult.transaction.getSummary());

    // 3. 游戏中奖
    console.log('\n3. 游戏中奖');
    const winResult = await this.assetService.win({
      user_id: userId,
      currency,
      amount: new Decimal('80'),
      game_id: 'GAME_001',
      description: '老虎机游戏中奖',
    });

    console.log('中奖后资产:', winResult.asset.getBalanceDetails());
    console.log('中奖交易:', winResult.transaction.getSummary());

    // 4. 锁定余额（游戏进行中）
    console.log('\n4. 锁定余额');
    const lockResult = await this.assetService.lockBalance(
      userId,
      currency,
      new Decimal('30'),
      'GAME_002',
    );

    console.log('锁定后资产:', lockResult.getBalanceDetails());

    // 5. 解锁余额（游戏结束）
    console.log('\n5. 解锁余额');
    const unlockResult = await this.assetService.unlockBalance(
      userId,
      currency,
      new Decimal('30'),
      'GAME_002',
    );

    console.log('解锁后资产:', unlockResult.getBalanceDetails());

    // 6. 用户提现
    console.log('\n6. 用户提现');
    const withdrawResult = await this.assetService.withdraw({
      user_id: userId,
      currency,
      amount: new Decimal('50'),
      reference_id: 'WITHDRAW_001',
      description: '用户提现',
    });

    console.log('提现后资产:', withdrawResult.asset.getBalanceDetails());
    console.log('提现交易:', withdrawResult.transaction.getSummary());

    // 7. 查看交易历史
    console.log('\n7. 交易历史');
    const history = await this.assetService.getTransactionHistory(
      userId,
      currency,
      1,
      10,
    );
    console.log('交易总数:', history.total);
    console.log(
      '交易记录:',
      history.transactions.map((t) => t.getSummary()),
    );
  }

  /**
   * 示例：多币种资产管理
   */
  async exampleMultiCurrency() {
    const userId = 12345;

    console.log('\n=== 多币种资产管理示例 ===');

    // 充值USDT
    await this.assetService.deposit({
      user_id: userId,
      currency: Currency.USDT,
      amount: new Decimal('1000'),
      description: '充值USDT',
    });

    // 充值BTC
    await this.assetService.deposit({
      user_id: userId,
      currency: Currency.BTC,
      amount: new Decimal('0.1'),
      description: '充值BTC',
    });

    // 查看所有币种资产
    const assets = await this.assetService.getUserAssets(userId);
    console.log('用户所有资产:');
    assets.forEach((asset) => {
      console.log(`${asset.currency}:`, asset.getBalanceDetails());
    });
  }

  /**
   * 示例：赠金策略演示
   */
  async exampleBonusStrategy() {
    const userId = 12346;
    const currency = Currency.USDT;

    console.log('\n=== 赠金策略示例 ===');

    // 充值100U，获得10U赠金
    const depositResult = await this.assetService.deposit({
      user_id: userId,
      currency,
      amount: new Decimal('100'),
      description: '充值获得赠金',
    });

    console.log('充值后资产:', depositResult.asset.getBalanceDetails());

    // 下注60U（优先使用赠金）
    const betResult = await this.assetService.bet({
      user_id: userId,
      currency,
      amount: new Decimal('60'),
      game_id: 'GAME_BONUS',
      description: '使用赠金下注',
    });

    console.log('下注后资产:', betResult.asset.getBalanceDetails());
    console.log('下注详情:', betResult.transaction.metadata);

    // 中奖80U（进入赠金账户）
    const winResult = await this.assetService.win({
      user_id: userId,
      currency,
      amount: new Decimal('80'),
      game_id: 'GAME_BONUS',
      description: '赠金游戏中奖',
    });

    console.log('中奖后资产:', winResult.asset.getBalanceDetails());
    console.log('中奖详情:', winResult.transaction.metadata);
  }

  /**
   * 示例：错误处理
   */
  async exampleErrorHandling() {
    const userId = 12347;
    const currency = Currency.USDT;

    console.log('\n=== 错误处理示例 ===');

    try {
      // 尝试下注超过余额的金额
      await this.assetService.bet({
        user_id: userId,
        currency,
        amount: new Decimal('1000'),
        game_id: 'GAME_ERROR',
        description: '余额不足测试',
      });
    } catch (error) {
      console.log('预期错误:', error.message);
    }

    try {
      // 尝试提现超过可提现余额的金额
      await this.assetService.withdraw({
        user_id: userId,
        currency,
        amount: new Decimal('1000'),
        description: '可提现余额不足测试',
      });
    } catch (error) {
      console.log('预期错误:', error.message);
    }
  }

  /**
   * 示例：批量操作
   */
  async exampleBatchOperations() {
    const userId = 12348;
    const currency = Currency.USDT;

    console.log('\n=== 批量操作示例 ===');

    // 批量充值
    const deposits = [
      { amount: '50', description: '充值1' },
      { amount: '100', description: '充值2' },
      { amount: '200', description: '充值3' },
    ];

    for (const deposit of deposits) {
      await this.assetService.deposit({
        user_id: userId,
        currency,
        amount: new Decimal(deposit.amount),
        description: deposit.description,
      });
    }

    // 查看最终资产
    const asset = await this.assetService.getUserAsset(userId, currency);
    console.log('批量充值后资产:', asset.getBalanceDetails());

    // 查看交易历史
    const history = await this.assetService.getTransactionHistory(
      userId,
      currency,
      1,
      20,
    );
    console.log('交易历史总数:', history.total);
  }
}
