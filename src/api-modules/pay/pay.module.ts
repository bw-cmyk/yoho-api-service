import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayService } from './services/pay.service';
import { PayController } from './controllers/pay.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([]), UserModule],
  providers: [PayService],
  controllers: [PayController],
  exports: [PayService],
})
export class PayModule {}
