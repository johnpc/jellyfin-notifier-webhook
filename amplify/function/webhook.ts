import type { Schema } from '../data/resource';
import { sendMessageToAllActiveSessions } from './helpers/sendMessageToAllActiveSessions';

export const handler: Schema['webhook']['functionHandler'] = async (input) => {
  console.log({ input });
  const message = input.arguments.message;
  const messagesSent = await sendMessageToAllActiveSessions(message!);
  const response = `Sent ${messagesSent} messages`;
  console.log({ response });
  return { value: response };
};
