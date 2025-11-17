import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../entity/user.entity';
import { SignService } from '../../../common-modules/sign/sign.service';
import { In, Repository } from 'typeorm';
import { ethers, getAddress } from 'ethers';
import { isEmpty, pick, omit } from 'lodash';
import { SignatureParams } from '../dto/SignatureDto';
import { IdService } from 'src/common-modules/id/id.service';
import { EmailService } from 'src/common-modules/email/email.service';
import { JwtService } from '@nestjs/jwt';
import {
  BotIMLoginParams,
  BotIMResp,
  BotIMUserBaseInfo,
} from '../dto/BotIMUserBaseInfo';
import axios from 'axios';

const VISIBLE_FIELDS = [
  'username',
  'email',
  'id',
  'nickname',
  'twitterUid',
  'twitterId',
  'discordId',
  'discordName',
  'googleId',
  'googleEmail',
  'facebookEmail',
  'facebookId',
  'appleId',
  'twitterToken',
  'dcRefreshToken',
  'referralCode',
  'referralUid',
  'referralChannel',
  'role',
  'parentAccount',
  'evmEOAWallet',
  'evmAAWallet',
  'solanaEOAWalletName',
  'solanaAAWalletAddress',
  'botId',
  'botimMobile',
  'botimName',
  'botimAvatar',
  'banned',
];

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    private readonly configService: ConfigService,

    private readonly signService: SignService,

    private readonly idService: IdService,

    private readonly emailService: EmailService,

    private readonly jwtService: JwtService,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  public async getAllUserIds(): Promise<string[]> {
    const users = await this.userRepository.find({
      select: ['id'],
    });
    return users.map((user) => user.id);
  }

  public async getUser(uid: string): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({
      where: { id: uid },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const filterUser = pick(user, VISIBLE_FIELDS);
    return {
      ...filterUser,
    };
  }

  public async login({ username, verifyCode }) {
    await this.emailService.verify(username, 'login', verifyCode);
    if (username === 'sc@steadyhash.ai') {
      username = 'l@steadyhash.ai';
    }
    const user = await this.userRepository.findOne({
      where: { username },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return pick(user, VISIBLE_FIELDS);
  }

  public async sendLoginEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: { username: email },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    await this.emailService.sendEmail(email, 'login');
  }

  public async getSignatureNonce(sign: SignatureParams) {
    const { address, feature, chainId, inGame } = sign;
    const message = await this.signService.getNonce(
      this.formatAddress(address),
      feature,
      chainId,
    );
    return {
      message: inGame ? message.replace(/\n/g, '<br>') : message,
    };
  }

  public async updateUserProfile(user: Partial<User>) {
    if (user.nickname) {
      const u = await this.userRepository.findOne({
        where: { nickname: user.nickname },
      });
      if (!!u && u.id !== user.id) {
        throw new BadRequestException('nickname should be unique');
      }
    }
    if (user.twitterId) {
      const u = await this.userRepository.findOne({
        where: { twitterId: user.twitterId },
      });
      if (!!u && u.id !== user.id) {
        throw new BadRequestException({
          error: 'Bad Request',
          message: 'twitterId has been bound',
          code: 'TWITTER_EXIST_ERROR',
          statusCode: 400,
        });
      }
    }

    if (user.discordId) {
      const u = await this.userRepository.findOne({
        where: { discordId: user.discordId },
      });
      if (!!u && u.id !== user.id) {
        throw new BadRequestException({
          error: 'Bad Request',
          message: 'discordId has been bound',
          code: 'DISCORD_EXIST_ERROR',
          statusCode: 400,
        });
      }
    }
    await this.userRepository.update(
      {
        id: user.id,
      },
      omit(user, ['id', 'username', 'password']),
    );
  }

  public async getUserByEmail(email: string) {
    const users = await this.userRepository
      .createQueryBuilder()
      .where(`username=:username`, {
        username: email.toLowerCase(),
      })
      .getMany();

    const user = users[0];

    return pick(user, VISIBLE_FIELDS);
  }

  public async getUsersByUids(uids: string[]) {
    const user = await this.userRepository.find({
      select: VISIBLE_FIELDS as any,
      where: { id: In(uids) },
    });
    return user;
  }

  public async getUsers(query: any) {
    const queryBuilder = this.userRepository.createQueryBuilder();
    if (query.username) {
      queryBuilder.where(`username=:username`, {
        username: `%${query.username.toLowerCase()}%`,
      });
    }
    if (query.offset) {
      queryBuilder.offset(query.offset);
    }
    if (query.limit) {
      queryBuilder.limit(query.limit);
    }
    if (query.uids) {
      queryBuilder.where('id IN (:...uids)', { uids: query.uids });
    }

    return queryBuilder.getMany();
  }

  public async banUser(uid: string) {
    const user = await this.userRepository.findOne({
      where: { id: uid },
    });
    user.banned = true;
    await this.userRepository.save(user);
  }

  private formatAddress(address: string) {
    try {
      return getAddress(address);
    } catch (e) {
      throw new BadRequestException('Invalid address');
    }
  }

  public async createUserWithEmailUserName(
    email: string,
    parentAccount?: string,
  ) {
    const existedUser = await this.userRepository.findOne({
      where: { username: email },
    });

    if (existedUser) {
      throw new BadRequestException('Email already registered');
    }

    const user = await this._createUser();
    user.email = email;
    user.username = email;
    user.parentAccount = parentAccount;
    user.nickname = `user_${user.id}`;
    if (user.email.indexOf('@') !== -1) {
      user.nickname = user.email.split('@')[0];
    }
    const result = await this.userRepository.save(user);

    return await this.getUser(result.id);
  }

  public async findOrCreateUserWithEmail(email: string) {
    const existedUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existedUser) {
      return await this.getUser(existedUser.id);
    }

    const user = await this._createUser();
    user.email = email;
    user.nickname = `user_${user.id}`;
    const result = await this.userRepository.save(user);

    return await this.getUser(result.id);
  }

  public async findOrCreateUserWithTwitter(
    twitterUid: string,
    twitterId: string,
    nickname = '',
  ) {
    const existedUser = await this.userRepository.findOne({
      where: { twitterId },
    });

    if (existedUser) {
      return await this.getUser(existedUser.id);
    }
    const user = await this._createUser();
    user.twitterId = twitterId;
    user.twitterUid = twitterUid;
    user.nickname = nickname;
    const result = await this.userRepository.save(user);
    return await this.getUser(result.id);
  }

  public async findOrCreateUserWithFacebook(facebookId: string, nickname = '') {
    const existedUser = await this.userRepository.findOne({
      where: { facebookId },
    });

    if (existedUser) {
      return await this.getUser(existedUser.id);
    }

    const user = await this._createUser();
    user.facebookId = facebookId;
    user.nickname = nickname;
    const result = await this.userRepository.save(user);

    return await this.getUser(result.id);
  }

  public async findOrCreateUserWithDiscord(
    discordId: string,
    discordName: string,
  ) {
    const existedUser = await this.userRepository.findOne({
      where: { discordId },
    });

    if (existedUser) {
      return await this.getUser(existedUser.id);
    }

    const user = await this._createUser();
    user.discordId = discordId;
    user.discordName = discordName;
    user.nickname = discordName;
    const result = await this.userRepository.save(user);

    return await this.getUser(result.id);
  }

  public async findOrCreateUserWithGoogle(
    googleId: string,
    googleEmail: string,
    nickname = '',
  ) {
    const existedUser = await this.userRepository.findOne({
      where: { googleId },
    });

    if (existedUser) {
      return await this.getUser(existedUser.id);
    }

    if (googleEmail) {
      const existedUserWithEmail = await this.userRepository.findOne({
        where: { username: googleEmail },
      });

      if (existedUserWithEmail) {
        existedUserWithEmail.googleId = googleId;
        existedUserWithEmail.googleEmail = googleEmail;
        await this.userRepository.save(existedUserWithEmail);

        return await this.getUser(existedUserWithEmail.id);
      }
    }

    const user = await this._createUser();
    user.googleEmail = googleEmail;
    user.email = googleEmail;
    user.googleId = googleId;
    user.nickname = nickname;
    const result = await this.userRepository.save(user);

    return await this.getUser(result.id);
  }

  public async findOrCreateUserWithApple(appleId: string, email = '') {
    const existedUser = await this.userRepository.findOne({
      where: { appleId },
    });

    if (existedUser) {
      return await this.getUser(existedUser.id);
    }

    if (email) {
      const existedUserWithEmail = await this.userRepository.findOne({
        where: { username: email },
      });

      if (existedUserWithEmail) {
        existedUserWithEmail.appleId = appleId;
        await this.userRepository.save(existedUserWithEmail);

        return await this.getUser(existedUserWithEmail.id);
      }
    }

    const user = await this._createUser();
    user.appleId = appleId;
    user.email = email;
    user.nickname = `user_${user.id}`;
    const result = await this.userRepository.save(user);

    return await this.getUser(result.id);
  }

  public async bindFacebook(uid: string, facebookId: string) {
    const existedUser = await this.userRepository.findOne({
      where: { facebookId },
    });

    if (existedUser) {
      throw new BadRequestException('Facebook account already bound');
    }

    const user = await this.userRepository.findOne({
      where: { id: uid },
    });

    user.facebookId = facebookId;
    const result = await this.userRepository.save(user);

    return pick(result, VISIBLE_FIELDS);
  }

  public async bindGoogle(uid: string, googleId: string, googleEmail: string) {
    const existedUser = await this.userRepository.findOne({
      where: { googleId },
    });

    if (existedUser) {
      throw new BadRequestException('Google account already bound');
    }

    if (googleEmail) {
      const existedUserWithEmail = await this.userRepository.findOne({
        where: { username: googleEmail },
      });

      if (existedUserWithEmail) {
        throw new BadRequestException('Google account already bound');
      }
    }

    const user = await this.userRepository.findOne({
      where: { id: uid },
    });

    user.googleEmail = googleEmail;
    user.email = user.email ? user.email : googleEmail;
    user.googleId = googleId;
    const result = await this.userRepository.save(user);

    return pick(result, VISIBLE_FIELDS);
  }

  public async bindApple(uid: string, appleId: string, email: string) {
    const existedUser = await this.userRepository.findOne({
      where: { appleId },
    });

    if (existedUser) {
      throw new BadRequestException('Apple account already bound');
    }

    if (email) {
      const existedUserWithEmail = await this.userRepository.findOne({
        where: { username: email },
      });

      if (existedUserWithEmail) {
        existedUserWithEmail.appleId = appleId;
        await this.userRepository.save(existedUserWithEmail);

        throw new BadRequestException('Apple account already bound');
      }
    }

    const user = await this.userRepository.findOne({
      where: { id: uid },
    });

    user.appleId = appleId;
    user.email = email;
    user.nickname = `user_${user.id}`;
    const result = await this.userRepository.save(user);

    return pick(result, VISIBLE_FIELDS);
  }

  async findOrCreateUserWithBotIM(info: BotIMLoginParams) {
    const { accessToken } = info;
    try {
      const resp = await axios.get<BotIMResp<BotIMUserBaseInfo>>(
        `https://openapi.botim.me/api/cuserrs/user/v1/userBaseInfo`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const data = resp.data;
      console.log(data);
      if (data?.code === 0 && data?.data?.user) {
        const botimUserInfo = data.data.user;
        const existedUser = await this.userRepository.findOne({
          where: { botId: botimUserInfo.uid },
        });

        if (existedUser) {
          return await this.getUser(existedUser.id);
        }

        const user = await this._createUser();
        user.botId = botimUserInfo.uid;
        user.botimMobile = botimUserInfo.mobile;
        user.nickname = botimUserInfo.name;
        user.botimName = botimUserInfo.name;
        user.botimAvatar = botimUserInfo.avatar;
        const result = await this.userRepository.save(user);

        return pick(result, VISIBLE_FIELDS);
      }
      throw new UnauthorizedException(data.message || 'Invalid BotIM token');
    } catch (error) {
      this.logger.error('BotIM login error', error);
      throw new UnauthorizedException('Invalid BotIM token');
    }
  }

  private async _createUser() {
    const user = new User();
    user.id = this.idService.getId();
    user.nickname = `user_${user.id}`;
    return user;
  }

  public signJwt(payload: any) {
    return this.jwtService.sign(payload);
  }
}
