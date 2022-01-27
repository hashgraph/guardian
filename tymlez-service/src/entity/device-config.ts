import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class DeviceConfig implements IDeviceConfig {
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
  config!: IUIServiceDeviceConfig;

  @CreateDateColumn()
  createDate!: Date;

  @UpdateDateColumn()
  updateDate!: Date;
}

export interface IDeviceConfig {
  key: string;
  deviceId: string;
  policyTag: string;
  config: IUIServiceDeviceConfig;
}

export interface IUIServiceDeviceConfig {
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
