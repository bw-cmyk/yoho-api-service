import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum SharePlatform {
  TWITTER = 'TWITTER',
  TELEGRAM = 'TELEGRAM',
  FACEBOOK = 'FACEBOOK',
  LINK = 'LINK',
  OTHER = 'OTHER',
}

@Entity('yoho_showcase_share')
@Index(['showcaseId', 'createdAt'])
@Index(['userId'])
@Index(['platform', 'createdAt'])
export class ShowcaseShare {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int', name: 'showcase_id' })
  showcaseId: number;

  @Column({ type: 'varchar', length: 64, name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: SharePlatform,
    default: SharePlatform.LINK,
  })
  platform: SharePlatform;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'share_url' })
  shareUrl: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'user_agent' })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
