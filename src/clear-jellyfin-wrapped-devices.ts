import { getSessionApi, getDevicesApi } from '@jellyfin/sdk/lib/utils/api';
import * as dotenv from 'dotenv';
import { getAuthenticatedJellyfinApi } from '../amplify/function/helpers/getAuthenticatedJellyfinApi';

dotenv.config();

/**
 * Script to clear all devices with DeviceName "Jellyfin-Wrapped"
 * This helps clean up any lingering sessions that might interfere with functionality
 */
async function clearJellyfinWrappedDevices() {
  console.log('🔍 Starting cleanup of Jellyfin-Wrapped devices...');

  try {
    const jellyfinApi = await getAuthenticatedJellyfinApi();
    const sessionApi = getSessionApi(jellyfinApi);
    const devicesApi = getDevicesApi(jellyfinApi);

    // Get all current sessions
    console.log('📡 Fetching current sessions...');
    const sessions = await sessionApi.getSessions();
    console.log(`📊 Found ${sessions.data.length} total sessions`);

    // Filter sessions with the target device name
    const targetSessions = sessions.data.filter((session) => session.DeviceName === 'Jellyfin-Wrapped');

    console.log(`🎯 Found ${targetSessions.length} sessions with DeviceName "Jellyfin-Wrapped"`);

    if (targetSessions.length === 0) {
      console.log('✅ No Jellyfin-Wrapped devices found. Nothing to clean up!');
      return;
    }

    // Sort sessions by last activity date (oldest first)
    targetSessions.sort((a, b) => {
      const dateA = new Date(a.LastActivityDate || 0).getTime();
      const dateB = new Date(b.LastActivityDate || 0).getTime();
      return dateA - dateB; // Ascending order (oldest first)
    });

    // Display sessions that will be terminated
    console.log('\n📋 Sessions to be terminated (sorted oldest first):');
    targetSessions.forEach((session, index) => {
      console.log(`  ${index + 1}. User: ${session.UserName || 'Unknown'}`);
      console.log(`     Device ID: ${session.DeviceId || 'No Device ID'}`);
      console.log(`     Session ID: ${session.Id || 'No Session ID'}`);
      console.log(`     Last Activity: ${session.LastActivityDate || 'Unknown'}`);
      console.log('');
    });

    // Terminate each session by deleting its device
    let successCount = 0;
    let failureCount = 0;

    console.log('🗑️  Starting device termination...');

    for (const session of targetSessions) {
      try {
        console.log(`   Terminating device: ${session.DeviceId}`);
        await devicesApi.deleteDevice({ id: session.DeviceId! });
        console.log(`   ✅ Successfully terminated device: ${session.DeviceId}`);
        successCount++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`   ❌ Failed to terminate device ${session.DeviceId}: ${errorMessage}`);
        failureCount++;
      }
    }

    console.log('\n📈 Cleanup Summary:');
    console.log(`   ✅ Successfully terminated: ${successCount} devices`);
    console.log(`   ❌ Failed to terminate: ${failureCount} devices`);
    console.log(`   📊 Total processed: ${targetSessions.length} sessions`);

    console.log('\n🎉 Cleanup completed! Jellyfin-Wrapped devices have been cleared.');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('💥 Script failed:', errorMessage);
    console.error('Stack trace:', errorStack);
  }
}

// Run the cleanup function
clearJellyfinWrappedDevices()
  .then(() => {
    console.log('\n🏁 Script execution completed.');
  })
  .catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
