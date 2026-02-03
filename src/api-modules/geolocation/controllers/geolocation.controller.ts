import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../common-modules/auth/jwt-auth.guard';
import { GeolocationService } from '../../../common-modules/geolocation/geolocation.service';
import {
  GeolocationResponseDto,
  LookupIpQueryDto,
} from '../../../common-modules/geolocation/dto/geolocation.dto';

/**
 * 地理定位 API 控制器
 * 提供 IP 地理定位查询端点
 */
@ApiTags('Geolocation')
@Controller('api/v1/geolocation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GeolocationController {
  constructor(private readonly geolocationService: GeolocationService) {}

  /**
   * 获取当前请求 IP 的地理位置
   */
  @Get('ip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取当前请求 IP 的地理位置',
    description:
      '自动检测请求来源 IP 地址并返回其地理位置信息。支持代理和负载均衡器场景。',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回地理位置信息',
    type: GeolocationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '无法提取 IP 地址或 IP 地址无效',
  })
  @ApiResponse({
    status: 401,
    description: '未授权，需要有效的 JWT token',
  })
  async getCurrentIpLocation(
    @Req() req: Request,
  ): Promise<GeolocationResponseDto> {
    const data = await this.geolocationService.getLocationFromRequest(req);
    return data as GeolocationResponseDto;
  }

  /**
   * 查询指定 IP 的地理位置
   */
  @Get('lookup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询指定 IP 的地理位置',
    description:
      '根据提供的 IP 地址查询其地理位置信息。支持 IPv4 和 IPv6 地址。',
  })
  @ApiQuery({
    name: 'ip',
    description: 'IP 地址（IPv4 或 IPv6）',
    example: '8.8.8.8',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: '成功返回地理位置信息',
    type: GeolocationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'IP 地址格式无效或为私有 IP',
  })
  @ApiResponse({
    status: 401,
    description: '未授权，需要有效的 JWT token',
  })
  async lookupIp(
    @Query() query: LookupIpQueryDto,
  ): Promise<GeolocationResponseDto> {
    const data = await this.geolocationService.getLocation(query.ip);
    return data as GeolocationResponseDto;
  }
}
