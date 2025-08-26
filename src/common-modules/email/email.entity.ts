import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({
  name: 'yoho_email',
})
export class Email {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  receiver: string;

  @Column()
  sender: string;

  @Column({ nullable: true })
  uid: string;

  @Column()
  type: string;

  @Index()
  @Column()
  verifyCode: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
