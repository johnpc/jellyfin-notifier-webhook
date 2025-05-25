import type { Schema } from '../data/resource';
import { sendMessageToAllActiveSessions } from './helpers/sendMessageToAllActiveSessions';

export const handler: Schema['webhook']['functionHandler'] = async (input) => {
  console.log({ input });
  const message = input.arguments.message;
  const header = input.arguments.header;
  const messagesSent = await sendMessageToAllActiveSessions(message!, header!);
  const response = `Sent ${messagesSent} messages`;
  console.log({ response });
  return { value: response };
};
