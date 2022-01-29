import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { IIsoDate } from './IIsoDate';

@Entity()
export class ProcessedMrv implements IProcessedMrv {
  @ObjectIdColumn()
  id!: string;

  @Column({
    unique: true,
  })
  key!: string;

  @Column()
  deviceId!: string;

  @Column()
  policyTag!: string;

  @Column()
  timestamp!: IIsoDate;

  @CreateDateColumn()
  createDate!: Date;

  @UpdateDateColumn()
  updateDate!: Date;
}

export interface IProcessedMrv {
  key: string;
  deviceId: string;
  policyTag: string;
  timestamp: IIsoDate;
}
