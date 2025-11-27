import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from 'src/common-modules/auth/jwt-auth.guard';
import { ShippingAddressService } from '../services/shipping-address.service';
import {
  CreateShippingAddressDto,
  UpdateShippingAddressDto,
} from '../dto/shipping-address.dto';

@ApiTags('收货地址管理')
@ApiBearerAuth()
@Controller('/api/v1/ecommerce/shipping-addresses')
export class ShippingAddressController {
  constructor(private readonly addressService: ShippingAddressService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '创建收货地址' })
  async createAddress(
    @Request() req: ExpressRequest,
    @Body() dto: CreateShippingAddressDto,
  ) {
    const { id: userId } = req.user as any;
    return await this.addressService.createAddress(userId, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '更新收货地址' })
  async updateAddress(
    @Request() req: ExpressRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShippingAddressDto,
  ) {
    const { id: userId } = req.user as any;
    return await this.addressService.updateAddress(id, userId, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取我的收货地址列表' })
  async getMyAddresses(@Request() req: ExpressRequest) {
    const { id: userId } = req.user as any;
    return await this.addressService.getUserAddresses(userId);
  }

  @Get('default')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取默认收货地址' })
  async getDefaultAddress(@Request() req: ExpressRequest) {
    const { id: userId } = req.user as any;
    return await this.addressService.getDefaultAddress(userId);
  }

  @Post(':id/set-default')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '设置默认收货地址' })
  async setDefaultAddress(
    @Request() req: ExpressRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { id: userId } = req.user as any;
    return await this.addressService.setDefaultAddress(id, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '删除收货地址' })
  async deleteAddress(
    @Request() req: ExpressRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { id: userId } = req.user as any;
    await this.addressService.deleteAddress(id, userId);
    return { success: true };
  }
}
