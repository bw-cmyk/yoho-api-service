import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../entity/user.entity';

@Entity('yoho_user_settings')
export class UserSetting {
  @PrimaryColumn()
  userId: string;

  @PrimaryColumn({ length: 50 })
  settingKey: string; // 设置键,如 'currency', 'language', 'theme'

  @Column('text')
  settingValue: string; // 设置值,如 'AED', 'en', 'dark'

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
