import { SessionApi } from '@jellyfin/sdk/lib/generated-client/api/session-api';

export async function sendSessionMessage(sessionApi: SessionApi, sessionId: string, message: string) {
  await sessionApi.sendMessageCommand({
    sessionId: sessionId,
    messageCommand: {
      Text: message,
      TimeoutMs: 10000,
    },
  });
}
