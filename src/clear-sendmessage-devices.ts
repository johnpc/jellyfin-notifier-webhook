import { getSessionApi, getDevicesApi } from '@jellyfin/sdk/lib/utils/api';
import * as dotenv from 'dotenv';
import { getAuthenticatedJellyfinApi } from '../amplify/function/helpers/getAuthenticatedJellyfinApi';

dotenv.config();

/**
 * Script to clear all devices with DeviceName "SendMessageToAllActiveSessions"
 * This helps clean up any lingering sessions that might interfere with the webhook functionality
 */
async function clearSendMessageDevices() {
  console.log('🔍 Starting cleanup of SendMessageToAllActiveSessions devices...');

  try {
    const jellyfinApi = await getAuthenticatedJellyfinApi();
    const sessionApi = getSessionApi(jellyfinApi);
    const devicesApi = getDevicesApi(jellyfinApi);

    // Get all current sessions
    console.log('📡 Fetching current sessions...');
    const sessions = await sessionApi.getSessions();
    console.log(`📊 Found ${sessions.data.length} total sessions`);

    // Filter sessions with the target device name
    const targetSessions = sessions.data.filter((session) => session.DeviceName === 'SendMessageToAllActiveSessions');

    console.log(`🎯 Found ${targetSessions.length} sessions with DeviceName "SendMessageToAllActiveSessions"`);

    if (targetSessions.length === 0) {
      console.log('✅ No SendMessageToAllActiveSessions devices found. Nothing to clean up!');
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
        if (session.DeviceId) {
          console.log(`   Terminating device: ${session.DeviceId}`);
          await devicesApi.deleteDevice({ id: session.DeviceId });
          successCount++;
          console.log(`   ✅ Successfully terminated device: ${session.DeviceId}`);
        } else {
          console.log(`   ⚠️  Skipping session ${session.Id} - no device ID found`);
          failureCount++;
        }
      } catch (error) {
        console.error(`   ❌ Failed to terminate device ${session.DeviceId}:`, error);
        failureCount++;
      }

      // Note: removeUserFromSession might not be the right method here
      // This line was causing compilation errors, commenting out for now
      // sessionApi.removeUserFromSession({
      //   sessionId: session.Id!,
      // });
    }

    // Summary
    console.log('\n📈 Cleanup Summary:');
    console.log(`   ✅ Successfully terminated: ${successCount} devices`);
    console.log(`   ❌ Failed to terminate: ${failureCount} devices`);
    console.log(`   📊 Total processed: ${targetSessions.length} sessions`);

    if (successCount > 0) {
      console.log('\n🎉 Cleanup completed! SendMessageToAllActiveSessions devices have been cleared.');
    } else if (failureCount > 0) {
      console.log('\n⚠️  Cleanup completed with errors. Some devices could not be terminated.');
    }
  } catch (error) {
    console.error('💥 Error during cleanup process:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  clearSendMessageDevices()
    .then(() => {
      console.log('\n🏁 Script execution completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { clearSendMessageDevices };
