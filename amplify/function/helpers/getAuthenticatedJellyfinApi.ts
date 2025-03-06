import { Api } from '@jellyfin/sdk';
import { authenticateByUserName } from './authenticateByUserName';
export const getAuthenticatedJellyfinApi = async (): Promise<Api> => {
  const serverUrl = process.env.JELLYFIN_SERVER_URL;
  const username = process.env.JELLYFIN_SERVER_USERNAME;
  const password = process.env.JELLYFIN_SERVER_PASSWORD;

  if (!serverUrl || !username || !password) {
    throw new Error('Missing credentials. Please configure your Jellyfin connection.');
  }
  return await authenticateByUserName(serverUrl, username, password);
};
