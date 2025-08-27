import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ethers, getAddress, verifyMessage } from 'ethers';
import { Repository } from 'typeorm';
import { Sign } from './sign.entity';
import * as moment from 'moment';
import { SIGN_MAP } from './contants';
import { template } from 'lodash';

@Injectable()
export class SignService {
  private readonly logger = new Logger(SignService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Sign)
    private readonly signRepository: Repository<Sign>,
  ) {}

  async getNonce(wallet: string, type: string, chainId = 1) {
    const address = this.formatAddress(wallet);

    let sign = await this.signRepository.findOne({
      where: {
        address,
        type,
        chainId,
      },
    });
    if (!sign) {
      sign = new Sign();
      sign.address = address;
    }
    sign.chainId = chainId;
    sign.type = type;
    sign.nonce = template(SIGN_MAP[type])({
      chainId,
      address,
      nonce: Date.now(),
    });

    await this.signRepository.save(sign);

    return sign.nonce;
  }

  async verify(wallet: string, signature: string, type: string, chainId = 1) {
    const address = this.formatAddress(wallet);
    const sign = await this.signRepository.findOne({
      where: {
        address,
        type,
        chainId,
      },
    });
    if (
      !sign ||
      moment(sign.updatedDate).isBefore(moment().subtract(1, 'hours'))
    ) {
      throw new BadRequestException(`Invalid Sign`);
    }
    try {
      const recoveredAddress = verifyMessage(sign.nonce, signature);
      if (recoveredAddress !== address) {
        throw new BadRequestException(`Invalid Sign`);
      }
      return recoveredAddress;
    } catch (e) {
      throw new BadRequestException(`Invalid Sign`);
    }
  }

  formatAddress(address: string) {
    try {
      return getAddress(address);
    } catch (e) {
      throw new BadRequestException('Invalid address');
    }
  }
}
