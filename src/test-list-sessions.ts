import { getSessionApi } from '@jellyfin/sdk/lib/utils/api';
import { getAllSessions } from '../amplify/function/helpers/sendMessageToAllActiveSessions';
import { getAuthenticatedJellyfinApi } from '../amplify/function/helpers/getAuthenticatedJellyfinApi';
import dotenv from 'dotenv';
dotenv.config();

const main = async () => {
  const client = await getAuthenticatedJellyfinApi();
  const sessionApi = await getSessionApi(client);
  const sessionResponse = await getAllSessions(sessionApi);
  const sessions = sessionResponse.data.filter(
    (s) =>
      s.Id &&
      s.DeviceName !== 'SendMessageToAllActiveSessions' &&
      s.DeviceName !== 'Jellyfin-Wrapped' &&
      s.DeviceName !== 'Jellyseerr' &&
      s.UserName?.toLowerCase() === 'john',
  );
  const mappedSessions = sessions.map((s) => `${s.UserName} - ${s.DeviceName} - ${s.IsActive} - ${s.NowPlayingItem}`);
  console.log({ mappedSessions });
};

main();
