import { Controller, Request, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { HookService } from '../services/hooks.service';

@ApiBearerAuth()
@ApiTags('Meta Merge')
@Controller('api/v1/deposit-withdraw/')
export class DepositWithdrawHookController {
  constructor(private readonly hookService: HookService) {}

  @ApiResponse({
    status: 200,
    description: 'Defender Hooks',
  })
  @Post('/hooks')
  async defenderHooksPost(@Request() req: ExpressRequest) {
    await this.hookService.processDefenderEvents(req.body.events || []);
    return {};
  }
}
