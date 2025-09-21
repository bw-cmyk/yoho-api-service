import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import axios from 'axios';
import { ParticleUserInfoResponse } from '../dto/WalletDto';
import { ethers } from 'ethers';
import { User } from '../entity/user.entity';
import { SignService } from 'src/common-modules/sign/sign.service';
import { UniversalAccount } from '@particle-network/universal-account-sdk';

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

  public async bindAAWallet(uid: string, address: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: uid },
      });
      if (!user.evmEOAWallet) {
        throw new BadRequestException('Please bind EOA wallet first');
      }
      if (user.evmAAWallet) {
        throw new BadRequestException("You've already bind a wallet");
      }

      const universalAccount = new UniversalAccount({
        projectId: process.env.PARTICLE_PROJECT_ID || '',
        projectClientKey: process.env.PARTICLE_SERVER_KEY || '',
        projectAppUuid: process.env.PARTICLE_APP_UUID || '',
        ownerAddress: user.evmEOAWallet,
      });
      const smartAccountOptions =
        await universalAccount.getSmartAccountOptions();
      if (smartAccountOptions.smartAccountAddress !== address) {
        throw new BadRequestException('Invalid address');
      }

      user.evmAAWallet = this.formatAddress(
        smartAccountOptions.smartAccountAddress,
      );
      await this.userRepository.save(user);
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      throw new BadRequestException('Invalid signature');
    }
  }

  public async getUniversalAccount(uid: string) {
    const user = await this.userRepository.findOne({
      where: { id: uid },
    });
    const universalAccount = new UniversalAccount({
      projectId: process.env.PARTICLE_PROJECT_ID || '',
      projectClientKey: process.env.PARTICLE_SERVER_KEY || '',
      projectAppUuid: process.env.PARTICLE_APP_UUID || '',
      ownerAddress: user.evmAAWallet,
    });
    return universalAccount;
  }
}
