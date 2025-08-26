import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Email } from './email.entity';
import { EmailService } from './email.service';

@Module({
  imports: [TypeOrmModule.forFeature([Email])],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
