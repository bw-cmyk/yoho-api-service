import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ShowcaseStatus {
  PENDING = 'PENDING', // 待审核
  APPROVED = 'APPROVED', // 已通过
  REJECTED = 'REJECTED', // 已拒绝
  HIDDEN = 'HIDDEN', // 已隐藏
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

@Entity('yoho_showcase')
@Index(['userId', 'createdAt'])
@Index(['status', 'createdAt'])
export class Showcase {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 64, name: 'user_id' })
  @Index()
  userId: string;

  // 用户信息快照（冗余存储，避免频繁关联查询）
  @Column({ type: 'varchar', length: 128, nullable: true, name: 'user_name' })
  userName: string;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'user_avatar' })
  userAvatar: string;

  // 内容
  @Column({ type: 'text', nullable: true })
  content: string; // 文案内容

  // 媒体文件（图片或视频）
  @Column({ type: 'json', default: [] })
  media: Array<{
    type: MediaType;
    url: string;
    thumbnailUrl?: string; // 视频缩略图
    cloudflareId?: string; // Cloudflare 文件ID，用于删除
  }>;

  // 关联的抽奖/商品信息（可选）
  @Column({ type: 'int', nullable: true, name: 'product_id' })
  productId: number;

  @Column({ type: 'int', nullable: true, name: 'draw_round_id' })
  drawRoundId: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'prize_info' })
  prizeInfo: string; // 奖品信息描述

  // 中奖关联
  @Column({ type: 'int', nullable: true, name: 'draw_result_id' })
  @Index()
  drawResultId: number | null;

  @Column({ type: 'boolean', default: false, name: 'is_winner_showcase' })
  @Index()
  isWinnerShowcase: boolean;

  // 中奖信息快照
  @Column({ type: 'int', nullable: true, name: 'winning_number' })
  winningNumber: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'prize_type' })
  prizeType: string | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
    name: 'prize_value',
  })
  prizeValue: string | null;

  // 实物奖品发货地址快照
  @Column({ type: 'json', nullable: true, name: 'shipping_address_snapshot' })
  shippingAddressSnapshot: {
    recipientName: string;
    phoneNumber: string;
    country: string;
    state: string;
    city: string;
    streetAddress: string;
    apartment: string;
    zipCode: string;
    fullAddress: string;
  } | null;

  // 验证标识
  @Column({ type: 'boolean', default: false, name: 'is_verified' })
  @Index()
  isVerified: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'verified_at' })
  verifiedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'verification_note' })
  verificationNote: string | null;

  // 互动数据
  @Column({ type: 'int', default: 0, name: 'like_count' })
  likeCount: number;

  @Column({ type: 'int', default: 0, name: 'view_count' })
  viewCount: number;

  @Column({ type: 'int', default: 0, name: 'comment_count' })
  commentCount: number;

  @Column({ type: 'int', default: 0, name: 'share_count' })
  shareCount: number;

  // 审核状态
  @Column({
    type: 'enum',
    enum: ShowcaseStatus,
    default: ShowcaseStatus.PENDING,
  })
  status: ShowcaseStatus;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'reject_reason' })
  rejectReason: string; // 拒绝原因

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'reviewer_id' })
  reviewerId: string;

  // 是否置顶
  @Column({ type: 'boolean', default: false, name: 'is_pinned' })
  isPinned: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number; // 排序优先级

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
