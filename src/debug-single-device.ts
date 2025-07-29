import { getSessionApi, getDevicesApi } from '@jellyfin/sdk/lib/utils/api';
import * as dotenv from 'dotenv';
import { getAuthenticatedJellyfinApi } from '../amplify/function/helpers/getAuthenticatedJellyfinApi';

dotenv.config();

/**
 * Debug script to test device deletion with a single session
 * This helps us understand the authorization issues
 */
async function debugSingleDevice() {
  console.log('🔍 Starting single device deletion debug...');

  try {
    const jellyfinApi = await getAuthenticatedJellyfinApi();
    const sessionApi = getSessionApi(jellyfinApi);
    const devicesApi = getDevicesApi(jellyfinApi);

    // Get authentication info
    console.log('🔐 Authentication info:');
    console.log('  Server URL:', process.env.JELLYFIN_SERVER_URL);
    console.log('  Username:', process.env.JELLYFIN_SERVER_USERNAME);
    console.log('  API Token:', jellyfinApi.accessToken ? 'Present' : 'Missing');
    // console.log('  User ID:', jellyfinApi.userId); // This property doesn't exist

    // Get all current sessions
    console.log('\n📡 Fetching current sessions...');
    const sessions = await sessionApi.getSessions();
    console.log(`📊 Found ${sessions.data.length} total sessions`);

    // Filter sessions with the target device name
    const targetSessions = sessions.data.filter((session) => session.DeviceName === 'SendMessageToAllActiveSessions');
    console.log(`🎯 Found ${targetSessions.length} sessions with DeviceName "SendMessageToAllActiveSessions"`);

    if (targetSessions.length === 0) {
      console.log('✅ No SendMessageToAllActiveSessions devices found. Nothing to clean up!');
      return;
    }

    // Take just the first session for debugging
    const testSession = targetSessions[0];
    console.log('\n🧪 Testing with first session:');
    console.log('  User:', testSession.UserName);
    console.log('  Device ID:', testSession.DeviceId);
    console.log('  Session ID:', testSession.Id);
    console.log('  Device Name:', testSession.DeviceName);
    console.log('  Client:', testSession.Client);
    console.log('  Last Activity:', testSession.LastActivityDate);

    // Try to get device info first
    console.log('\n📱 Attempting to get device info...');
    try {
      // Try to get all devices first to see what we have access to
      const allDevices = await devicesApi.getDevices();
      console.log(`📋 Found ${allDevices.data.Items?.length || 0} total devices accessible to this user`);

      // Look for our target device
      const targetDevice = allDevices.data.Items?.find((device) => device.Id === testSession.DeviceId);
      if (targetDevice) {
        console.log('✅ Target device found in device list:');
        console.log('  Device ID:', targetDevice.Id);
        console.log('  Device Name:', targetDevice.Name);
        console.log('  Last User Name:', targetDevice.LastUserName);
        console.log('  Date Last Activity:', targetDevice.DateLastActivity);
      } else {
        console.log('❌ Target device NOT found in accessible device list');
        console.log('Available device IDs:', allDevices.data.Items?.map((d) => d.Id).slice(0, 5));
      }
    } catch (deviceError: unknown) {
      const errorMessage = deviceError instanceof Error ? deviceError.message : String(deviceError);
      console.log('❌ Failed to get device info:', errorMessage);
    }

    // Now try to delete the device
    console.log('\n🗑️ Attempting to delete device...');
    try {
      await devicesApi.deleteDevice({ id: testSession.DeviceId! });
      console.log('✅ Successfully deleted device!');
    } catch (deleteError: unknown) {
      const errorMessage = deleteError instanceof Error ? deleteError.message : String(deleteError);
      console.log('❌ Failed to delete device:', errorMessage);

      // Handle axios-like error objects
      if (deleteError && typeof deleteError === 'object' && 'response' in deleteError) {
        const axiosError = deleteError as { response?: { status?: number; statusText?: string } };
        console.log('Status:', axiosError.response?.status);
        console.log('Status Text:', axiosError.response?.statusText);
      }

      // Handle config objects
      if (deleteError && typeof deleteError === 'object' && 'config' in deleteError) {
        const configError = deleteError as { config?: { url?: string; method?: string; headers?: unknown } };
        if (configError.config) {
          console.log('Request URL:', configError.config.url);
          console.log('Request Method:', configError.config.method);
          console.log('Request Headers:', configError.config.headers);
        }
      }
    }

    // Also try alternative approaches
    console.log('\n🔄 Trying alternative session termination...');
    try {
      // Try using session API to stop the session
      // await sessionApi.postSessionsLogout({ sessionId: testSession.Id! }); // This method doesn't exist
      console.log('⚠️ Alternative session termination method not available');
    } catch (sessionError: unknown) {
      const errorMessage = sessionError instanceof Error ? sessionError.message : String(sessionError);
      console.log('❌ Session logout failed:', errorMessage);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('💥 Script failed:', errorMessage);
    console.error('Stack trace:', errorStack);
  }
}

// Run the debug function
debugSingleDevice()
  .then(() => {
    console.log('\n🏁 Debug script completed.');
  })
  .catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
