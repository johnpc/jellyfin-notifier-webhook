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
      // Include People field to ensure we get actor and director information
      fields: ['People'],
    });

    if (itemsResponse.data.Items && itemsResponse.data.Items.length > 0) {
      console.log(`Found ${itemsResponse.data.Items.length} items`);

      // Create map to store combined people counts
      const peopleCounts = new Map<string, number>();

      // Process each item
      itemsResponse.data.Items.forEach((item) => {
        if (item.People && item.People.length > 0) {
          item.People.forEach((person) => {
            if (person.Name && (person.Type === 'Actor' || person.Type === 'Director')) {
              // Increment count for each actor or director
              peopleCounts.set(person.Name, (peopleCounts.get(person.Name) || 0) + 1);
            }
          });
        }
      });

      // Sort people by count (ascending) and display combined results
      console.log('\nActors and Directors Statistics (Combined):');
      console.log('----------------------------------------');

      const sortedPeople = Array.from(peopleCounts.entries()).sort((a, b) => a[1] - b[1]);

      sortedPeople.forEach(([person, count]) => {
        console.log(`${person}: ${count} item${count !== 1 ? 's' : ''}`);
      });

      // Display summary statistics for combined people list
      console.log('----------------------------------------');
      console.log(`Total unique actors and directors: ${peopleCounts.size}`);
      console.log(`Total items processed: ${itemsResponse.data.Items.length}`);
      console.log(
        `Items without people: ${itemsResponse.data.Items.filter((item) => !item.People || item.People.length === 0).length}`,
      );
    } else {
      console.log('No items found');
    }
  } catch (error) {
    console.error('Error fetching items:', error);
  }
};

main();
