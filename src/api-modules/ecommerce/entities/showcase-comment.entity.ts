import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm';

@Entity('yoho_showcase_comment')
@Tree('materialized-path')
@Index(['showcaseId', 'createdAt'])
@Index(['userId'])
@Index(['parentId'])
@Index(['isDeleted', 'showcaseId'])
export class ShowcaseComment {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int', name: 'showcase_id' })
  showcaseId: number;

  @Column({ type: 'varchar', length: 64, name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'user_name' })
  userName: string;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'user_avatar' })
  userAvatar: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', nullable: true, name: 'parent_id' })
  parentId: number | null;

  @TreeParent()
  parent: ShowcaseComment;

  @TreeChildren()
  children: ShowcaseComment[];

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'reply_to_user_id' })
  replyToUserId: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'reply_to_user_name' })
  replyToUserName: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_deleted' })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
