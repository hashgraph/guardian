import axios from 'axios';
import type { ISchema } from 'interfaces';
import type { IUser } from '../user';

export async function getAllSchemasFromUiService({
  rootAuthority,
  uiServiceBaseUrl,
}: {
  uiServiceBaseUrl: string;
  rootAuthority: IUser;
}) {
  const { data: schemas } = (await axios.get(`${uiServiceBaseUrl}/api/schema`, {
    headers: {
      authorization: `Bearer ${rootAuthority.accessToken}`,
    },
  })) as { data: ISchema[] };

  return schemas;
}
