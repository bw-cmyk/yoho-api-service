import { Exclude } from 'class-transformer';
import {
  Entity,
  Column,
  DeleteDateColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
  PrimaryColumn,
} from 'typeorm';

export enum Role {
  INNER = 1000,
  LP = 100,
  HOLDER = 10,
  HOLDER_READ_ONLY = 5,
  INIT = 1,
}

@Entity({
  name: 'yoho_user',
})
@Unique(['username'])
export class User {
  @PrimaryColumn()
  id: string;

  @Column({ nullable: true })
  @Exclude()
  @Index()
  username: string;

  @Column({ nullable: true, select: false })
  password: string;

  @Column({
    nullable: true,
  })
  nickname: string;

  @Column({
    nullable: true,
  })
  email: string;

  @Column({
    nullable: true,
  })
  twitterUid: string;

  @Column({
    nullable: true,
  })
  @Index()
  twitterId: string;

  @Column({
    nullable: true,
  })
  @Index()
  discordId: string;

  @Column({
    nullable: true,
  })
  discordName: string;

  @Column({
    nullable: true,
    select: false,
  })
  @Exclude()
  twitterToken: string;

  @Column({
    nullable: true,
    select: false,
  })
  @Exclude()
  dcRefreshToken: string;

  @Column({
    nullable: true,
  })
  @Index()
  referralCode: string;

  @Column({
    nullable: true,
  })
  @Index()
  referralChannel: string;

  @Column({
    nullable: true,
  })
  referralUid: string;

  @Column({
    nullable: true,
  })
  facebookId: string;

  @Column({
    nullable: true,
  })
  facebookEmail: string;

  @Column({
    nullable: true,
  })
  @Index()
  googleId: string;

  @Column({
    nullable: true,
  })
  @Index()
  appleId: string;

  @Column({
    nullable: true,
  })
  googleEmail: string;

  @Column({
    name: 'botim_user_id',
    nullable: true,
  })
  botId: string;

  @Column({
    nullable: true,
    name: 'botim_mobile',
  })
  botimMobile: string;

  @Column({
    nullable: true,
    name: 'botim_name',
  })
  botimName: string;

  @Column({
    nullable: true,
    name: 'botim_avatar',
  })
  botimAvatar: string;

  @Column({
    nullable: true,
    name: 'evm_eoa_wallet',
  })
  evmEOAWallet: string;

  @Column({
    nullable: true,
    name: 'evm_aa_wallet',
  })
  evmAAWallet: string;

  @Column({
    nullable: true,
    name: 'solana_eoa_wallet_name',
  })
  solanaEOAWalletName: string;

  @Column({
    nullable: true,
    name: 'solana_aa_wallet_address',
  })
  solanaAAWalletAddress: string;

  @Column({
    nullable: true,
  })
  banned: boolean;

  @Column({
    name: 'role',
    default: Role.HOLDER,
  })
  role: Role;

  @Column({
    name: 'parent_account',
    nullable: true,
  })
  parentAccount: string;

  @CreateDateColumn({
    select: false,
  })
  @Exclude()
  createdAt: Date;

  @UpdateDateColumn({
    select: false,
  })
  @Exclude()
  updatedAt: Date;

  @DeleteDateColumn({
    select: false,
  })
  @Exclude()
  deletedDate: Date;
}
