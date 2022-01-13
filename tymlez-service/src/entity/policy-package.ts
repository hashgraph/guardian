import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class PolicyPackage {
  @ObjectIdColumn()
  id!: string;

  @Column()
  policy!: {
    id: string;
    inputPolicyTag: string;
  };

  @Column()
  schemas!: {
    id: string;
    uuid: string;
    inputName: string;
  }[];

  @CreateDateColumn()
  createDate!: Date;

  @UpdateDateColumn()
  updateDate!: Date;
}

export interface IPolicyPackage {
  id: string;
  policy: {
    id: string;
    inputPolicyTag: string;
  };
  schemas: {
    id: string;
    uuid: string;
    inputName: string;
  }[];
}
