import { getItemsApi } from '@jellyfin/sdk/lib/utils/api';
import { getAuthenticatedJellyfinApi } from '../amplify/function/helpers/getAuthenticatedJellyfinApi';
import dotenv from 'dotenv';
dotenv.config();

const main = async () => {
  try {
    const client = await getAuthenticatedJellyfinApi();
    const itemsApi = getItemsApi(client);

    // Get all Movies and Series
    const itemsResponse = await itemsApi.getItems({
      recursive: true,
      sortBy: ['Name'],
      sortOrder: ['Ascending'],
      includeItemTypes: ['Movie', 'Series'],
      // Include Tags field to ensure we get tag information
      fields: ['Tags'],
    });

    if (itemsResponse.data.Items && itemsResponse.data.Items.length > 0) {
      console.log(`Found ${itemsResponse.data.Items.length} items`);

      // Create a map to store tag counts
      const tagCounts = new Map<string, number>();

      // Process each item
      itemsResponse.data.Items.forEach((item) => {
        if (item.Tags && item.Tags.length > 0) {
          item.Tags.forEach((tag) => {
            // Increment count for each tag
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          });
        }
      });

      // Sort tags by count (ascending) and display results
      console.log('\nTag Statistics:');
      console.log('----------------------------------------');

      const sortedTags = Array.from(tagCounts.entries()).sort((a, b) => a[1] - b[1]); // Changed this line to sort ascending

      sortedTags.forEach(([tag, count]) => {
        console.log(`${tag}: ${count} item${count !== 1 ? 's' : ''}`);
      });

      // Display some summary statistics
      console.log('----------------------------------------');
      console.log(`Total unique tags: ${tagCounts.size}`);
      console.log(`Total items processed: ${itemsResponse.data.Items.length}`);
      console.log(
        `Items without tags: ${itemsResponse.data.Items.filter((item) => !item.Tags || item.Tags.length === 0).length}`,
      );
    } else {
      console.log('No items found');
    }
  } catch (error) {
    console.error('Error fetching items:', error);
  }
};

main();
