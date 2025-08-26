import { Snowflake } from 'nodejs-snowflake';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MachineIdEntity } from './MachineId.entity';
import * as os from 'os';

@Injectable()
export class IdService {
  private snowflake: Snowflake;
  constructor(
    @InjectRepository(MachineIdEntity)
    private readonly machineIdRepository: Repository<MachineIdEntity>,
  ) {}

  public async init() {
    const { id } = await this.machineIdRepository.save({
      machineHostId: os.hostname(),
    });
    this.snowflake = new Snowflake({
      custom_epoch: 1671162461903,
      instance_id: id % 4095,
    });
  }

  public getId() {
    return this.snowflake.getUniqueID().toString();
  }
}
