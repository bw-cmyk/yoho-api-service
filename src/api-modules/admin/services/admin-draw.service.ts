import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DrawRound, DrawRoundStatus } from '../../ecommerce/entities/draw-round.entity';
import { DrawResult } from '../../ecommerce/entities/draw-result.entity';
import { DrawService } from '../../ecommerce/services/draw.service';

@Injectable()
export class AdminDrawService {
  constructor(
    @InjectRepository(DrawRound)
    private readonly drawRoundRepo: Repository<DrawRound>,
    @InjectRepository(DrawResult)
    private readonly drawResultRepo: Repository<DrawResult>,
    private readonly drawService: DrawService,
  ) {}

  async getRounds(productId: number, page: number, limit: number) {
    const [items, total] = await this.drawRoundRepo.findAndCount({
      where: { productId },
      order: { roundNumber: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 获取已开奖轮次的结果
    const drawnRoundIds = items
      .filter((r) => r.status === DrawRoundStatus.DRAWN)
      .map((r) => r.id);

    let resultsMap: Record<number, DrawResult> = {};
    if (drawnRoundIds.length > 0) {
      const results = await this.drawResultRepo.find({
        where: drawnRoundIds.map((id) => ({ drawRoundId: id })),
      });
      resultsMap = results.reduce(
        (acc, r) => {
          acc[r.drawRoundId] = r;
          return acc;
        },
        {} as Record<number, DrawResult>,
      );
    }

    return {
      data: items.map((round) => ({
        id: round.id,
        productId: round.productId,
        roundNumber: round.roundNumber,
        totalSpots: round.totalSpots,
        soldSpots: round.soldSpots,
        pricePerSpot: round.pricePerSpot.toString(),
        prizeValue: round.prizeValue.toString(),
        status: round.status,
        completedAt: round.completedAt,
        drawnAt: round.drawnAt,
        createdAt: round.createdAt,
        result: resultsMap[round.id]
          ? {
              winningNumber: resultsMap[round.id].winningNumber,
              winnerUserId: resultsMap[round.id].winnerUserId,
              winnerUserName: resultsMap[round.id].winnerUserName,
              prizeStatus: resultsMap[round.id].prizeStatus,
            }
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRoundDetail(id: number) {
    const round = await this.drawRoundRepo.findOne({
      where: { id },
      relations: ['product'],
    });

    if (!round) {
      throw new NotFoundException('轮次不存在');
    }

    let result = null;
    if (round.status === DrawRoundStatus.DRAWN) {
      result = await this.drawResultRepo.findOne({
        where: { drawRoundId: id },
      });
    }

    return {
      ...round,
      pricePerSpot: round.pricePerSpot.toString(),
      prizeValue: round.prizeValue.toString(),
      result,
    };
  }

  async processDraw(id: number) {
    const round = await this.drawRoundRepo.findOne({ where: { id } });

    if (!round) {
      throw new NotFoundException('轮次不存在');
    }

    if (round.status === DrawRoundStatus.DRAWN) {
      throw new BadRequestException('该轮次已开奖');
    }

    if (round.status === DrawRoundStatus.CANCELLED) {
      throw new BadRequestException('该轮次已取消');
    }

    // 调用 DrawService 的开奖方法
    return this.drawService.processDraw(id);
  }

  async createRound(productId: number) {
    return this.drawService.getOrCreateCurrentRound(productId);
  }
}
