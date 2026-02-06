import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import {
  NotificationType,
  NotificationStatus,
  NotificationTargetType,
} from '../enums/notification.enums';

@Entity('yoho_notifications')
@Index(['userId', 'status', 'createdAt'])
@Index(['type', 'createdAt'])
@Index(['targetType'])
export class Notification {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationTargetType,
    name: 'target_type',
  })
  targetType: NotificationTargetType;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'user_id' })
  @Index()
  userId: string | null; // null for system-wide broadcasts

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null; // 附加数据，如 orderId, drawResultId

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'image_url' })
  imageUrl: string | null; // 富通知图片

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'action_type' })
  actionType: string | null; // 如 'ROUTER', 'EXTERNAL_LINK'

  @Column({
    type: 'varchar',
    length: 512,
    nullable: true,
    name: 'action_value',
  })
  actionValue: string | null; // 路由路径或 URL

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.UNREAD,
  })
  status: NotificationStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'read_at' })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}
