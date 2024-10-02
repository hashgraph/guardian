import { ObjectId } from '@mikro-orm/mongodb';

//entities
import {BaseEntity} from '../../../dist/index.js';

export class TestEntity extends BaseEntity {
  constructor({name = 'Test Entity', dryRunId, dryRunClass} = {}) {
    super();
    this._id = new ObjectId();
    this.id = this._id.toString();
    this.name = name;
    this.dryRunId = dryRunId;
    this.dryRunClass = dryRunClass;
  }
}