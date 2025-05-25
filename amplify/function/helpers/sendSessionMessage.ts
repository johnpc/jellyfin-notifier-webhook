import { SessionApi } from '@jellyfin/sdk/lib/generated-client/api/session-api';

export async function sendSessionMessage(sessionApi: SessionApi, sessionId: string, message: string, header: string) {
  const messagePayload = {
    sessionId: sessionId,
    messageCommand: {
      Text: message,
      Header: header,
      TimeoutMs: 5000,
    },
  };
  console.log({ messagePayload });
  await sessionApi.sendMessageCommand(messagePayload);
}
