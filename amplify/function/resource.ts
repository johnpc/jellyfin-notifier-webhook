import { defineFunction } from '@aws-amplify/backend';
import dotenv from 'dotenv';
dotenv.config();

const functionProps = {
  entry: './webhook.ts',
  environment: {
    JELLYFIN_SERVER_URL: process.env.JELLYFIN_SERVER_URL!,
    JELLYFIN_SERVER_USERNAME: process.env.JELLYFIN_SERVER_USERNAME!,
    JELLYFIN_SERVER_PASSWORD: process.env.JELLYFIN_SERVER_PASSWORD!,
  },
  timeoutSeconds: 120,
};
export const webhook = defineFunction(functionProps);
