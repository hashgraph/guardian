import assert from 'assert';
import axios from 'axios';
import type { IUser } from './IUser';

export async function loginToUiService({
  uiServiceBaseUrl,
  username,
}: {
  uiServiceBaseUrl: string;
  username: UserName;
}) {
  const loginDetail = LOGIN_DETAILS[username];
  assert(loginDetail, `Cannot find login detail for ${username}`);

  const { data: user } = (await axios.post(
    `${uiServiceBaseUrl}/api/account/login`,
    { username, password: loginDetail.password },
  )) as { data: IUser | undefined };

  assert(user, `Failed to login as ${username}`);

  return user;
}

const LOGIN_DETAILS = {
  RootAuthority: { password: 'test' },
  Installer: { password: 'test' },
  Installer2: { password: 'test' },
};

export type UserName = keyof typeof LOGIN_DETAILS;
