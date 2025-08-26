import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdService } from './id.service';
import { MachineIdEntity } from './MachineId.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MachineIdEntity])],
  providers: [IdService],
  exports: [IdService],
})
export class IdModule {}
