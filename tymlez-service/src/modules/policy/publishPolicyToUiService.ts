import axios from 'axios';
import type { IUser } from '../user';

export async function publishPolicyToUiService({
  policyId,
  rootAuthority,
  uiServiceBaseUrl,
}: {
  policyId: string;
  uiServiceBaseUrl: string;
  rootAuthority: IUser;
}) {
  await axios.post(
    `${uiServiceBaseUrl}/policy/publish/${policyId}`,
    {},
    {
      headers: {
        authorization: `Bearer ${rootAuthority.accessToken}`,
      },
    },
  );
}
