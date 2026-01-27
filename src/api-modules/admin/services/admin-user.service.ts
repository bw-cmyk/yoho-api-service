import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { UpdateUserDto, QueryUserDto } from '../dto/user.dto';

@Injectable()
export class AdminUserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(query: QueryUserDto) {
    const { page = 1, limit = 10, keyword, role, banned } = query;
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

    return {
      data,
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
