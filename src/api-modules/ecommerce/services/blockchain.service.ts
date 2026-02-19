import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface BitcoinBlock {
  height: number;
  hash: string;
  time: number; // Unix timestamp
  prev_block: string;
  mrkl_root: string;
}

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly baseUrl = 'api.blockcypher.com';

  /**
   * 获取最新区块高度
   */
  async getLatestBlockHeight(): Promise<number> {
    try {
      const response = await axios.get(`https://blockchain.info/latestblock`, {
        timeout: 10000,
      });
      return response.data.height;
    } catch (error) {
      this.logger.error('获取最新区块高度失败', error);
      throw new Error('无法获取比特币区块信息');
    }
  }

  /**
   * 根据区块高度获取区块信息
   */
  async getBlockByHeight(height: number): Promise<BitcoinBlock> {
    try {
      const response = await axios.get(
        `https://blockchain.info/block-height/${height}?format=json`,
        {
          timeout: 10000,
        },
      );

      // API返回的是数组，取第一个
      const blocks = response.data.blocks;
      if (!blocks || blocks.length === 0) {
        throw new Error(`区块 ${height} 不存在`);
      }

      const block = blocks[0];
      return {
        height: block.height,
        hash: block.hash,
        time: block.time,
        prev_block: block.prev_block,
        mrkl_root: block.mrkl_root,
      };
    } catch (error) {
      this.logger.error(`获取区块 ${height} 失败`, error);
      throw new Error(`无法获取区块 ${height} 的信息`);
    }
  }

  /**
   * 根据区块哈希获取区块信息
   */
  async getBlockByHash(hash: string): Promise<BitcoinBlock> {
    try {
      const response = await axios.get(`${this.baseUrl}/rawblock/${hash}`, {
        timeout: 10000,
      });

      return {
        height: response.data.height,
        hash: response.data.hash,
        time: response.data.time,
        prev_block: response.data.prev_block,
        mrkl_root: response.data.mrkl_root,
      };
    } catch (error) {
      this.logger.error(`获取区块 ${hash} 失败`, error);
      throw new Error(`无法获取区块 ${hash} 的信息`);
    }
  }

  /**
   * 获取区块验证链接
   */
  getBlockVerificationUrl(blockHeight: number): string {
    return `https://blockchain.info/block/${blockHeight}`;
  }

  /**
   * 从区块哈希中提取最后6位数字（非字母）
   */
  extractLast6Digits(hash: string): string {
    // 移除所有字母，只保留数字
    const digits = hash.replace(/[^0-9]/g, '');
    // 取最后6位
    return digits.slice(-6) || '0'.repeat(6);
  }
}
