import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../user/entity/user.entity';

@Entity('yoho_bot_users')
export class BotUser {
  @PrimaryColumn()
  userId: string; // 关联 User.id

  @Column({ default: true })
  enabled: boolean;

  @Column({ name: 'display_name' })
  displayName: string;

  @Column({ name: 'display_avatar', nullable: true })
  displayAvatar: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string; // Admin user ID

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
