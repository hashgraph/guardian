import { MikroORM } from '@mikro-orm/core';

export async function Migration(initalConfig: any) {
  const orm = await MikroORM.init(initalConfig);
  const migrator = orm.getMigrator();
  await migrator.up();
  await orm.close(true);
};