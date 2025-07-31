import { getDevicesApi } from '@jellyfin/sdk/lib/utils/api';
import * as dotenv from 'dotenv';
import { getAuthenticatedJellyfinApi } from '../amplify/function/helpers/getAuthenticatedJellyfinApi';

dotenv.config();

async function debugDevicesApi() {
  try {
    const jellyfinApi = await getAuthenticatedJellyfinApi();
    const devicesApi = getDevicesApi(jellyfinApi);

    console.log('📡 Fetching devices...');
    const devices = await devicesApi.getDevices();

    console.log('🔍 Full response structure:');
    console.log('Type of devices:', typeof devices);
    console.log('Keys in devices:', Object.keys(devices));
    console.log('Type of devices.data:', typeof devices.data);
    console.log('devices.data:', devices.data);

    if (Array.isArray(devices.data)) {
      console.log('✅ devices.data is an array with length:', devices.data.length);
      if (devices.data.length > 0) {
        console.log('📋 First device structure:');
        console.log(JSON.stringify(devices.data[0], null, 2));
      }
    } else {
      console.log('❌ devices.data is not an array');
      console.log('Actual structure:', JSON.stringify(devices, null, 2));
    }
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

debugDevicesApi();
