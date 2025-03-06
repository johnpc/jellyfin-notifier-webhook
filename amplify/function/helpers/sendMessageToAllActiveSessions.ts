import { getSessionApi } from '@jellyfin/sdk/lib/utils/api';
import dotenv from 'dotenv';
import { getAuthenticatedJellyfinApi } from './getAuthenticatedJellyfinApi';
import { sendSessionMessage } from './sendSessionMessage';
import { SessionApi } from '@jellyfin/sdk/lib/generated-client/api/session-api';
dotenv.config();

export const getAllSessions = async (sessionApi: SessionApi) => {
  const sessions = await sessionApi.getSessions();
  console.log({ sessionCount: sessions.data.length });
  return sessions;
};

export async function sendMessageToAllActiveSessions(message: string) {
  console.log({ message });
  let messagesSent = 0;
  const sessionApi = getSessionApi(await getAuthenticatedJellyfinApi());
  const sessions = await getAllSessions(sessionApi);
  for (const session of sessions.data.filter(
    (s) =>
      s.Id &&
      s.DeviceName !== 'SendMessageToAllActiveSessions' &&
      s.DeviceName !== 'Jellyfin-Wrapped' &&
      s.DeviceName !== 'Jellyseerr',
  )) {
    console.log('Session:', `${session.UserName} - ${session.DeviceName}`);
    await sendSessionMessage(sessionApi, session.Id!, message);
    messagesSent++;
  }
  return messagesSent;
}
