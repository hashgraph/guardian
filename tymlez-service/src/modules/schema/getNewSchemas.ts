import { differenceBy } from 'lodash';
import { getAllSchemasFromUiService } from './getAllSchemasFromUiService';
import type { IUser } from '../user';
import type { ISchema } from 'interfaces';

export async function getNewSchemas({
  preImportSchemas,
  rootAuthority,
  uiServiceBaseUrl,
}: {
  uiServiceBaseUrl: string;
  rootAuthority: IUser;
  preImportSchemas: ISchema[];
}) {
  const postImportSchemas = await getAllSchemasFromUiService({
    uiServiceBaseUrl,
    rootAuthority,
  });

  const newSchemas = differenceBy(
    postImportSchemas,
    preImportSchemas,
    (obj) => obj.uuid,
  );

  return newSchemas;
}
