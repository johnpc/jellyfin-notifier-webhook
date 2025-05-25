import { sendMessageToAllActiveSessions } from '../amplify/function/helpers/sendMessageToAllActiveSessions';

const main = async () => {
  sendMessageToAllActiveSessions('Hello World!', 'Test');
};
main();
