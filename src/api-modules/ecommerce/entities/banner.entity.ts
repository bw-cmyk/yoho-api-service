import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BannerActionType {
  NONE = 'NONE', // 无动作
  ROUTER = 'ROUTER', // 路由跳转（应用内）
  EXTERNAL_LINK = 'EXTERNAL_LINK', // 外部链接
  PRODUCT = 'PRODUCT', // 跳转到商品详情
  DRAW = 'DRAW', // 跳转到抽奖
}

@Entity('yoho_ecommerce_banners')
@Index(['isActive', 'sortOrder'])
@Index(['startDate', 'endDate'])
export class Banner {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string; // 主标题

  @Column({ type: 'varchar', length: 255, nullable: true })
  subtitle: string | null; // 副标题

  @Column({ type: 'text', nullable: true })
  description: string | null; // 详细描述

  @Column({ type: 'varchar', length: 512, name: 'image_url' })
  imageUrl: string; // Banner 图片 URL

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'mobile_image_url' })
  mobileImageUrl: string | null; // 移动端图片 URL（可选）

  @Column({
    type: 'enum',
    enum: BannerActionType,
    default: BannerActionType.NONE,
    name: 'action_type',
  })
  actionType: BannerActionType; // 动作类型

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'action_value' })
  actionValue: string | null; // 动作值（路由路径、外部链接、商品ID等）

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'button_text' })
  buttonText: string | null; // 按钮文字（如 "Try Now"）

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'background_color' })
  backgroundColor: string | null; // 背景颜色（十六进制或渐变CSS）

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean; // 是否激活

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number; // 排序（数字越大越靠前）

  @Column({ type: 'timestamp', nullable: true, name: 'start_date' })
  startDate: Date | null; // 开始时间

  @Column({ type: 'timestamp', nullable: true, name: 'end_date' })
  endDate: Date | null; // 结束时间

  @Column({ type: 'int', default: 0, name: 'click_count' })
  clickCount: number; // 点击次数

  @Column({ type: 'int', default: 0, name: 'view_count' })
  viewCount: number; // 浏览次数

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * 检查 Banner 是否在有效期内
   */
  isInValidPeriod(): boolean {
    const now = new Date();
    if (this.startDate && now < this.startDate) {
      return false;
    }
    if (this.endDate && now > this.endDate) {
      return false;
    }
    return true;
  }

  /**
   * 检查 Banner 是否应该显示
   */
  shouldDisplay(): boolean {
    return this.isActive && this.isInValidPeriod();
  }
}
