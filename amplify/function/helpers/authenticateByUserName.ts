import { Api, Jellyfin } from '@jellyfin/sdk';

export const authenticateByUserName = async (serverUrl: string, username: string, password: string): Promise<Api> => {
  const jellyfin = new Jellyfin({
    clientInfo: {
      name: 'SendMessageToAllActiveSessions',
      version: '1.0.0',
    },
    deviceInfo: {
      name: 'SendMessageToAllActiveSessions',
      id: 'SendMessageToAllActiveSessions',
    },
  });
  const api = jellyfin.createApi(serverUrl);
  await api.authenticateUserByName(username, password);
  return api;
};
