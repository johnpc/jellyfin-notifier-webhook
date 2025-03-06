import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { webhook } from '../function/resource';

const schema = a.schema({
  StringType: a.customType({
    value: a.string(),
  }),
  webhook: a
    .query()
    .arguments({ message: a.string() })
    .returns(a.ref('StringType'))
    .handler(a.handler.function(webhook))
    .authorization((allow) => allow.publicApiKey()),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});
