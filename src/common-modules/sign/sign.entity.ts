import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

@Entity({
  name: 'yoho_sign',
})
// @Unique(['address', 'chainId', 'type'])
export class Sign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  address: string;

  @Column()
  @Index()
  chainId: number;

  @Column()
  @Index()
  type: string;

  @Column()
  nonce: string;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
