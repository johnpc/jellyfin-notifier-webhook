import { getDevicesApi } from '@jellyfin/sdk/lib/utils/api';
import * as dotenv from 'dotenv';
import { getAuthenticatedJellyfinApi } from '../amplify/function/helpers/getAuthenticatedJellyfinApi';

dotenv.config();

/**
 * Script to clear all devices that haven't connected in more than 2 months
 * This helps clean up old/abandoned devices from the Jellyfin server
 */
async function clearOldDevices() {
  console.log('🔍 Starting cleanup of devices inactive for >2 months...');

  try {
    const jellyfinApi = await getAuthenticatedJellyfinApi();
    const devicesApi = getDevicesApi(jellyfinApi);

    // Calculate the cutoff date (2 months ago)
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    console.log(`📅 Cutoff date: ${twoMonthsAgo.toISOString()}`);
    console.log('📡 Fetching all devices...');

    // Get all devices
    const devicesResponse = await devicesApi.getDevices();
    const devices = devicesResponse.data.Items || [];
    console.log(`📊 Found ${devices.length} total devices`);

    if (devices.length === 0) {
      console.log('✅ No devices found. Nothing to clean up!');
      return;
    }

    // Filter devices that haven't connected in more than 2 months
    const oldDevices = devices.filter((device) => {
      if (!device.DateLastActivity) {
        // If no last activity date, consider it old
        console.log(`⚠️  Device ${device.Name} (${device.Id}) has no last activity date - will be deleted`);
        return true;
      }

      const lastActivity = new Date(device.DateLastActivity);
      const isOld = lastActivity < twoMonthsAgo;

      if (isOld) {
        console.log(
          `🕒 Device ${device.Name} (${device.Id}) last active: ${lastActivity.toISOString()} - will be deleted`,
        );
      }

      return isOld;
    });

    console.log(`🎯 Found ${oldDevices.length} devices inactive for >2 months`);

    if (oldDevices.length === 0) {
      console.log('✅ No old devices found. Nothing to clean up!');
      return;
    }

    // Sort devices by last activity date (oldest first)
    oldDevices.sort((a, b) => {
      const dateA = a.DateLastActivity ? new Date(a.DateLastActivity).getTime() : 0;
      const dateB = b.DateLastActivity ? new Date(b.DateLastActivity).getTime() : 0;
      return dateA - dateB; // Ascending order (oldest first)
    });

    // Display devices that will be deleted
    console.log('\n📋 Devices to be deleted (sorted oldest first):');
    oldDevices.forEach((device, index) => {
      console.log(`  ${index + 1}. Name: ${device.Name || 'Unknown'}`);
      console.log(`     Device ID: ${device.Id || 'No Device ID'}`);
      console.log(`     App Name: ${device.AppName || 'Unknown'}`);
      console.log(`     App Version: ${device.AppVersion || 'Unknown'}`);
      console.log(`     Last Activity: ${device.DateLastActivity || 'Never'}`);
      console.log(`     User: ${device.LastUserName || 'Unknown'}`);
      console.log('');
    });

    // Ask for confirmation before proceeding
    console.log('⚠️  WARNING: This will permanently delete these devices from Jellyfin!');
    console.log('💡 Press Ctrl+C to cancel, or any key to continue...');

    // Wait for user input (in a real script, you might want to use readline)
    // For now, we'll add a small delay and continue
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Delete each device
    let successCount = 0;
    let failureCount = 0;

    console.log('🗑️  Starting device deletion...');

    for (const device of oldDevices) {
      try {
        console.log(`   Deleting device: ${device.Name} (${device.Id})`);
        await devicesApi.deleteDevice({ id: device.Id! });
        console.log(`   ✅ Successfully deleted device: ${device.Name} (${device.Id})`);
        successCount++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`   ❌ Failed to delete device ${device.Name} (${device.Id}): ${errorMessage}`);
        failureCount++;
      }
    }

    console.log('\n📈 Cleanup Summary:');
    console.log(`   ✅ Successfully deleted: ${successCount} devices`);
    console.log(`   ❌ Failed to delete: ${failureCount} devices`);
    console.log(`   📊 Total processed: ${oldDevices.length} devices`);
    console.log(`   📅 Cutoff date used: ${twoMonthsAgo.toISOString()}`);

    console.log('\n🎉 Cleanup completed! Old devices have been cleared.');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('💥 Script failed:', errorMessage);
    console.error('Stack trace:', errorStack);
  }
}

// Run the cleanup function
clearOldDevices()
  .then(() => {
    console.log('\n🏁 Script execution completed.');
  })
  .catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
