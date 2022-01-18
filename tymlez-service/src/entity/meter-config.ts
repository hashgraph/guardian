import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class MeterConfig implements IMeterConfig {
  @ObjectIdColumn()
  id!: string;

  @Column({
    unique: true,
  })
  key!: string;

  @Column()
  meterId!: string;

  @Column()
  policyTag!: string;

  @Column()
  config!: IUIServiceMeterConfig;

  @CreateDateColumn()
  createDate!: Date;

  @UpdateDateColumn()
  updateDate!: Date;
}

export interface IMeterConfig {
  meterId: string;
  config: IUIServiceMeterConfig;
}

export interface IUIServiceMeterConfig {
  url: string;
  topic: string;
  hederaAccountId: string;
  hederaAccountKey: string;
  installer: string;
  did: string;
  key: string;
  type: string;
  schema: any;
  policyId: string;
  policyTag: string;
}
