import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShippingAddress } from '../entities/shipping-address.entity';
import {
  CreateShippingAddressDto,
  UpdateShippingAddressDto,
} from '../dto/shipping-address.dto';

@Injectable()
export class ShippingAddressService {
  constructor(
    @InjectRepository(ShippingAddress)
    private readonly addressRepository: Repository<ShippingAddress>,
  ) {}

  /**
   * 创建收货地址
   */
  async createAddress(
    userId: string,
    dto: CreateShippingAddressDto,
  ): Promise<ShippingAddress> {
    // 如果设置为默认地址，需要先取消其他默认地址
    if (dto.isDefault) {
      await this.unsetDefaultAddress(userId);
    }

    const address = this.addressRepository.create({
      userId,
      recipientName: dto.recipientName,
      phoneNumber: dto.phoneNumber,
      country: dto.country,
      state: dto.state,
      city: dto.city,
      streetAddress: dto.streetAddress,
      apartment: dto.apartment,
      zipCode: dto.zipCode,
      isDefault: dto.isDefault ?? false,
    });

    return await this.addressRepository.save(address);
  }

  /**
   * 更新收货地址
   */
  async updateAddress(
    id: number,
    userId: string,
    dto: UpdateShippingAddressDto,
  ): Promise<ShippingAddress> {
    const address = await this.findByIdAndUserId(id, userId);

    if (dto.recipientName !== undefined)
      address.recipientName = dto.recipientName;
    if (dto.phoneNumber !== undefined) address.phoneNumber = dto.phoneNumber;
    if (dto.country !== undefined) address.country = dto.country;
    if (dto.state !== undefined) address.state = dto.state;
    if (dto.city !== undefined) address.city = dto.city;
    if (dto.streetAddress !== undefined)
      address.streetAddress = dto.streetAddress;
    if (dto.apartment !== undefined) address.apartment = dto.apartment;
    if (dto.zipCode !== undefined) address.zipCode = dto.zipCode;

    // 如果设置为默认地址，需要先取消其他默认地址
    if (dto.isDefault === true) {
      await this.unsetDefaultAddress(userId, id);
      address.isDefault = true;
    } else if (dto.isDefault === false) {
      address.isDefault = false;
    }

    return await this.addressRepository.save(address);
  }

  /**
   * 根据ID和用户ID查找地址
   */
  async findByIdAndUserId(
    id: number,
    userId: string,
  ): Promise<ShippingAddress> {
    const address = await this.addressRepository.findOne({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundException(`收货地址不存在: ${id}`);
    }

    return address;
  }

  /**
   * 获取用户的所有收货地址
   */
  async getUserAddresses(userId: string): Promise<ShippingAddress[]> {
    return await this.addressRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * 获取用户的默认地址
   */
  async getDefaultAddress(userId: string): Promise<ShippingAddress | null> {
    return await this.addressRepository.findOne({
      where: { userId, isDefault: true },
    });
  }

  /**
   * 设置默认地址
   */
  async setDefaultAddress(
    id: number,
    userId: string,
  ): Promise<ShippingAddress> {
    const address = await this.findByIdAndUserId(id, userId);

    // 取消其他默认地址
    await this.unsetDefaultAddress(userId, id);

    address.isDefault = true;
    return await this.addressRepository.save(address);
  }

  /**
   * 取消所有默认地址（除了指定的地址ID）
   */
  private async unsetDefaultAddress(
    userId: string,
    excludeId?: number,
  ): Promise<void> {
    const where: any = { userId, isDefault: true };
    if (excludeId) {
      where.id = { $ne: excludeId } as any;
    }

    const addresses = await this.addressRepository.find({
      where: { userId, isDefault: true },
    });

    for (const addr of addresses) {
      if (!excludeId || addr.id !== excludeId) {
        addr.isDefault = false;
        await this.addressRepository.save(addr);
      }
    }
  }

  /**
   * 删除收货地址
   */
  async deleteAddress(id: number, userId: string): Promise<void> {
    const address = await this.findByIdAndUserId(id, userId);

    const wasDefault = address.isDefault;

    await this.addressRepository.remove(address);

    // 如果删除的是默认地址，将第一个地址设为默认
    if (wasDefault) {
      const remainingAddresses = await this.getUserAddresses(userId);
      if (remainingAddresses.length > 0) {
        const firstAddress = remainingAddresses[0];
        firstAddress.isDefault = true;
        await this.addressRepository.save(firstAddress);
      }
    }
  }

  // find by address id
  async findById(id: number): Promise<ShippingAddress> {
    return await this.addressRepository.findOne({
      where: { id },
    });
  }
}
