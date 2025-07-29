import { getDevicesApi } from '@jellyfin/sdk/lib/utils/api';
import * as dotenv from 'dotenv';
import { getAuthenticatedJellyfinApi } from '../amplify/function/helpers/getAuthenticatedJellyfinApi';

dotenv.config();

/**
 * Script to list and delete all devices with Name "Jellyfin-Wrapped"
 * This targets the device registry directly rather than active sessions
 */
async function clearJellyfinWrappedDevicesRegistry() {
  console.log('🔍 Starting cleanup of Jellyfin-Wrapped devices from registry...');

  try {
    const jellyfinApi = await getAuthenticatedJellyfinApi();
    const devicesApi = getDevicesApi(jellyfinApi);

    // Get all devices from the registry
    console.log('📱 Fetching all devices from registry...');
    const allDevices = await devicesApi.getDevices();
    const devices = allDevices.data.Items || [];
    console.log(`📊 Found ${devices.length} total devices in registry`);

    // Filter devices with the target name
    const targetDevices = devices.filter((device) => device.Name === 'Jellyfin-Wrapped');

    console.log(`🎯 Found ${targetDevices.length} devices with Name "Jellyfin-Wrapped"`);

    if (targetDevices.length === 0) {
      console.log('✅ No Jellyfin-Wrapped devices found in registry. Nothing to clean up!');
      return;
    }

    // Sort devices by last activity date (oldest first)
    targetDevices.sort((a, b) => {
      const dateA = new Date(a.DateLastActivity || 0).getTime();
      const dateB = new Date(b.DateLastActivity || 0).getTime();
      return dateA - dateB; // Ascending order (oldest first)
    });

    // Display devices that will be deleted
    console.log('\n📋 Devices to be deleted (sorted oldest first):');
    targetDevices.forEach((device, index) => {
      console.log(`  ${index + 1}. Device Name: ${device.Name || 'Unknown'}`);
      console.log(`     Device ID: ${device.Id || 'No Device ID'}`);
      console.log(`     Last User: ${device.LastUserName || 'Unknown'}`);
      console.log(`     Last Activity: ${device.DateLastActivity || 'Unknown'}`);
      console.log(`     App Name: ${device.AppName || 'Unknown'}`);
      console.log(`     App Version: ${device.AppVersion || 'Unknown'}`);
      console.log('');
    });

    // Delete each device
    let successCount = 0;
    let failureCount = 0;

    console.log('🗑️  Starting device deletion...');

    for (const device of targetDevices) {
      try {
        console.log(`   Deleting device: ${device.Id}`);
        await devicesApi.deleteDevice({ id: device.Id! });
        console.log(`   ✅ Successfully deleted device: ${device.Id}`);
        successCount++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`   ❌ Failed to delete device ${device.Id}: ${errorMessage}`);
        failureCount++;
      }
    }

    console.log('\n📈 Cleanup Summary:');
    console.log(`   ✅ Successfully deleted: ${successCount} devices`);
    console.log(`   ❌ Failed to delete: ${failureCount} devices`);
    console.log(`   📊 Total processed: ${targetDevices.length} devices`);

    console.log('\n🎉 Cleanup completed! Jellyfin-Wrapped devices have been cleared from registry.');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('💥 Script failed:', errorMessage);
    console.error('Stack trace:', errorStack);
  }
}

// Run the cleanup function
clearJellyfinWrappedDevicesRegistry()
  .then(() => {
    console.log('\n🏁 Script execution completed.');
  })
  .catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
