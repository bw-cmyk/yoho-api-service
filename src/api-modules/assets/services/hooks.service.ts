import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DefenderEvent, DefenderEvents, MatchReason } from './DeferenderEvent';
import { DepositWithdrawService } from './deposit-withdraw.service';

@Injectable()
export class HookService {
  private readonly logger = new Logger(HookService.name);

  constructor(
    private readonly configService: ConfigService,

    private bingo0xService: DepositWithdrawService,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  public async processDefenderEvents(events: DefenderEvents) {
    for (const event of events) {
      await this.processDefenderEvent(event);
    }
  }

  private async processDefenderEvent(event: DefenderEvent) {
    for (const match of event.matchReasons) {
      if (match.type === 'event') {
        await this.handleMatchEvent(match);
      }
    }
  }

  public async handleMatchEvent(match: MatchReason) {
    try {
      if (
        match.signature === 'TokenDeposited(uint256,address,address,uint256)'
      ) {
        await this.handleDepositERC20Token(match.params);
      } else if (
        match.signature === 'TokenWithdrawn(uint256,address,address,uint256)'
      ) {
        await this.handleDepositERC20Token(match.params);
      } else if (
        match.signature ===
        'WithdrawERC20Token(uint256,address,address,uint256)'
      ) {
        await this.handleDepositNativeToken(match.params);
      } else if (
        match.signature === 'WithdrawNativeToken(uint256,address,uint256)'
      ) {
        await this.handleDepositNativeToken(match.params);
      }
    } catch (error) {
      this.logger.error(`Failed to handle match event:`, error);
      throw error;
    }
  }

  private async handleDepositERC20Token(params: Record<string, any>) {
    try {
      const orderId = parseInt(params.systemId);
      this.logger.log(`Processing ERC20 deposit for order ${orderId}`);
      await this.bingo0xService.updateOrderStatus(orderId);
    } catch (error) {
      this.logger.error(`Failed to handle ERC20 deposit:`, error);
      throw error;
    }
  }

  private async handleDepositNativeToken(params: Record<string, any>) {
    try {
      const orderId = parseInt(params.orderId);
      this.logger.log(`Processing native token deposit for order ${orderId}`);
      await this.bingo0xService.updateOrderStatus(orderId);
    } catch (error) {
      this.logger.error(`Failed to handle native token deposit:`, error);
      throw error;
    }
  }
}
