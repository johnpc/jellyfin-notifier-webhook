import { getItemsApi } from '@jellyfin/sdk/lib/utils/api';
import { getAuthenticatedJellyfinApi } from '../amplify/function/helpers/getAuthenticatedJellyfinApi';
import dotenv from 'dotenv';
dotenv.config();

const TAG = 'christmas';

const main = async () => {
  try {
    const client = await getAuthenticatedJellyfinApi();
    const itemsApi = getItemsApi(client);

    // Get items with the Christmas tag
    const itemsResponse = await itemsApi.getItems({
      tags: [TAG],
      // Additional optional parameters:
      recursive: true, // Search in all subfolders
      sortBy: ['Name'], // Sort results by name
      sortOrder: ['Ascending'],
      // fields: ['Overview', 'Path'], // Add if you want additional fields
      // includeItemTypes: ['Movie', 'Episode'] // Uncomment to filter by specific types
    });

    if (itemsResponse.data.Items && itemsResponse.data.Items.length > 0) {
      console.log(`Found ${itemsResponse.data.Items.length} items tagged with "${TAG}":`);
      console.log('----------------------------------------');

      itemsResponse.data.Items.forEach((item) => {
        console.log(`
Name: ${item.Name}
Type: ${item.Type}
Path: ${item.Path}
${item.ProductionYear ? `Year: ${item.ProductionYear}` : ''}
${item.Overview ? `Overview: ${item.Overview}` : ''}
----------------------------------------`);
      });
    } else {
      console.log(`No items found with tag "${TAG}"`);
    }
  } catch (error) {
    console.error('Error fetching items:', error);
  }
};

main();
