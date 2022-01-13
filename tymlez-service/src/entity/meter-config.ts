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
  did!: string;

  @Column({
    unique: true,
  })
  name!: string;

  @Column()
  url!: string;

  @Column()
  topic!: string;

  @Column()
  hederaAccountId!: string;

  @Column()
  hederaAccountKey!: string;

  @Column()
  installer!: string;

  @Column()
  key!: string;

  @Column()
  type!: string;

  @Column()
  schema: any;

  @Column()
  policyId!: string;

  @Column()
  policyTag!: string;

  @CreateDateColumn()
  createDate!: Date;

  @UpdateDateColumn()
  updateDate!: Date;
}

export interface IMeterConfig {
  did: string;
  url: string;
  topic: string;
  hederaAccountId: string;
  hederaAccountKey: string;
  installer: string;
  key: string;
  type: string;
  schema: any;
  policyId: string;
  policyTag: string;
}
