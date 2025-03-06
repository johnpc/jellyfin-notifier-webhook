import { Api, Jellyfin } from '@jellyfin/sdk';
import { generateGuid } from './generateGuid';

export const authenticateByUserName = async (serverUrl: string, username: string, password: string): Promise<Api> => {
  const jellyfin = new Jellyfin({
    clientInfo: {
      name: 'SendMessageToAllActiveSessions',
      version: '1.0.0',
    },
    deviceInfo: {
      name: 'SendMessageToAllActiveSessions',
      id: generateGuid(),
    },
  });
  const api = jellyfin.createApi(serverUrl);
  await api.authenticateUserByName(username, password);
  return api;
};
