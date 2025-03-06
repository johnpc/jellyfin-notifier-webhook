import fetch from 'node-fetch';
import outputs from '../amplify_outputs.json';
const apiKey = outputs.data.api_key;
const endpoint = outputs.data.url;
console.log({
  apiKey,
  endpoint,
});
async function callWebhook(message: string) {
  try {
    const input = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/graphql',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query: `query MyQuery { webhook(message: "${message}") { value } }`,
        operationName: 'MyQuery',
      }),
    };
    console.log({ input });
    const response = await fetch(endpoint, input);

    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error('Error:', error);
  }
}

// const message =
//   "{{#if_equals ItemType 'Movie'}}Movie Added: {{{Name}}} ({{Year}}).{{/if_equals}}{{#if_equals ItemType 'Season'}}Season Added: {{{SeriesName}}} ({{Year}}){{else}}Episode Added: {{{SeriesName}}} ({{Year}}) S{{SeasonNumber00}}E{{EpisodeNumber00}}{{/if_equals}}";

const message = 'hello';
callWebhook(message);
