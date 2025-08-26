import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import axios from 'axios';
import { ParticleUserInfoResponse } from '../dto/WalletDto';
import { ethers } from 'ethers';
import { User } from '../entity/user.entity';
import { SignService } from 'src/common-modules/sign/sign.service';

@Injectable()
export class WalletService {
  constructor(
    private readonly configService: ConfigService,

    private readonly signService: SignService,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  public async bindEOAWallet(
    uid: string,
    address: string,
    particleUid: string,
    particleAuthToken: string,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: uid },
    });
    if (user.evmEOAWallet) {
      throw new BadRequestException("You've already bind a wallet");
    }
    const endpoint = this.configService.get('PARTICLE_API_ENDPOINT');
    const projectId = this.configService.get('PARTICLE_PROJECT_ID');
    const serverKey = this.configService.get('PARTICLE_SERVER_KEY');
    const userInfo = await axios.post<ParticleUserInfoResponse>(
      endpoint,
      {
        jsonrpc: '2.0',
        id: 0,
        method: 'getUserInfo',
        params: [particleUid, particleAuthToken],
      },
      {
        auth: {
          username: projectId,
          password: serverKey,
        },
      },
    );
    const verifiedAddress = (userInfo.data?.result?.wallets || []).find(
      ({ chain }) => chain === 'evm_chain',
    )?.publicAddress;

    if (!verifiedAddress) {
      throw new BadRequestException('Invalid Address');
    }
    if (this.formatAddress(verifiedAddress) !== this.formatAddress(address)) {
      throw new BadRequestException('Address does not match Particle account');
    }
    user.evmEOAWallet = this.formatAddress(verifiedAddress);
    await this.userRepository.save(user);
  }

  private formatAddress(address: string) {
    try {
      return ethers.getAddress(address);
    } catch (e) {
      throw new BadRequestException('Invalid address');
    }
  }
}
