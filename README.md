# Jellyfin Message Webhook

A simple webhook integration that sends notifications when new content is added to your Jellyfin server.

## Setup

1. Clone this repository
2. Copy `.env.example` to `.env` and fill in your Jellyfin server details:

```env
JELLYFIN_SERVER_URL=your_server_url
JELLYFIN_SERVER_USERNAME=your_username
JELLYFIN_SERVER_PASSWORD=your_password
```

3. Install dependencies:

```bash
npm install
```

## Usage

The webhook will send simple notifications in the following formats:

For movies:

```bash
The Matrix added
```

```bash
Breaking Bad S1E1 added
```

## Configuration

### Jellyfin Setup

In Jellyfin, go to Dashboard > Plugins

Enable "Webhook" plugin

Configure a new webhook:

Set the webhook URL to your deployed endpoint

Set the x-api-key header to your deployed api key

Set the Content-Type header to application/graphql

Enable "Item Added" notifications

Set the body template to

```json
{
  "query": "query MyQuery { webhook(message: \"{{#if_equals ItemType 'Movie'}}Movie Added: {{{Name}}} ({{Year}}).{{/if_equals}}{{#if_equals ItemType 'Season'}}Season Added: {{{SeriesName}}} ({{Year}}){{else}}Episode Added: {{{SeriesName}}} ({{Year}}) S{{SeasonNumber00}}E{{EpisodeNumber00}}{{/if_equals}}\") { value } }",
  "operationName": "MyQuery"
}
```

Save the configuration.

### AWS Setup

1. Deploy the AWS infrastructure:

```bash
npx ampx sandbox
```

The deployment will create an AppSync API with API key authentication, which can be found in a generated file `amplify_outputs.json`.
