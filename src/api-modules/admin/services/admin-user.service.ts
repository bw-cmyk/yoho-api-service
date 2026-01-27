import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, In } from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { UserAsset, Currency } from '../../assets/entities/balance/user-asset.entity';
import { UpdateUserDto, QueryUserDto } from '../dto/user.dto';

@Injectable()
export class AdminUserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserAsset)
    private userAssetRepository: Repository<UserAsset>,
  ) {}

  async findAll(query: QueryUserDto) {
    const { page = 1, limit = 50, keyword, role, banned } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<User>[] = [];
    const baseWhere: FindOptionsWhere<User> = {};

    if (role !== undefined) {
      baseWhere.role = role;
    }
    if (banned !== undefined) {
      baseWhere.banned = banned;
    }

    if (keyword) {
      where.push(
        { ...baseWhere, username: Like(`%${keyword}%`) },
        { ...baseWhere, email: Like(`%${keyword}%`) },
        { ...baseWhere, nickname: Like(`%${keyword}%`) },
        { ...baseWhere, id: keyword },
      );
    } else {
      where.push(baseWhere);
    }

    const [data, total] = await this.userRepository.findAndCount({
      where: where.length > 0 ? where : undefined,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      select: [
        'id',
        'username',
        'nickname',
        'email',
        'role',
        'banned',
        'createdAt',
        'twitterId',
        'discordId',
        'googleId',
        'evmEOAWallet',
      ],
    });

    // 获取用户余额
    const userIds = data.map((u) => u.id);
    const assets = await this.userAssetRepository.find({
      where: { userId: In(userIds), currency: Currency.USD },
    });
    const assetMap = new Map(assets.map((a) => [a.userId, a]));

    const dataWithBalance = data.map((user) => {
      const asset = assetMap.get(user.id);
      return {
        ...user,
        balance: asset?.totalBalance?.toString() || '0',
      };
    });

    return {
      data: dataWithBalance,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    return this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'username',
        'nickname',
        'email',
        'role',
        'banned',
        'createdAt',
        'updatedAt',
        'twitterId',
        'discordId',
        'googleId',
        'facebookId',
        'appleId',
        'evmEOAWallet',
        'evmAAWallet',
        'referralCode',
        'referralChannel',
      ],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.userRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  async ban(id: string) {
    await this.userRepository.update(id, { banned: true });
    return { success: true, message: 'User banned' };
  }

  async unban(id: string) {
    await this.userRepository.update(id, { banned: false });
    return { success: true, message: 'User unbanned' };
  }

  async getStats() {
    const total = await this.userRepository.count();
    const banned = await this.userRepository.count({ where: { banned: true } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayNew = await this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :today', { today })
      .getCount();

    return {
      total,
      banned,
      active: total - banned,
      todayNew,
    };
  }
}
