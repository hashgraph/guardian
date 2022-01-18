import axios from 'axios';
import type { IUser } from '../user';

export async function getAllPoliciesFromUiService(
  uiServiceBaseUrl: string,
  rootAuthority: IUser,
) {
  return (
    await axios.get(`${uiServiceBaseUrl}/api/get-policy-list`, {
      headers: {
        authorization: `Bearer ${rootAuthority.accessToken}`,
      },
    })
  ).data as IPolicy[];
}

export interface IPolicy {
  id: string;
  status: string;
  name: string;
  policyTag: string;
  config: {
    id: string;
  };
}
