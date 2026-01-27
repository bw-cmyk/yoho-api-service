import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('yoho_showcase_like')
@Unique(['showcaseId', 'userId'])
@Index(['showcaseId'])
@Index(['userId'])
export class ShowcaseLike {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int', name: 'showcase_id' })
  showcaseId: number;

  @Column({ type: 'varchar', length: 64, name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
