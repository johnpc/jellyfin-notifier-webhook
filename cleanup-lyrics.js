#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const JELLYFIN_CONFIG = {
  serverUrl: process.env.JELLYFIN_SERVER_URL || 'http://192.168.7.211:8096',
  username: process.env.JELLYFIN_SERVER_USERNAME,
  password: process.env.JELLYFIN_SERVER_PASSWORD,
};

const SSH_CONFIG = {
  host: '192.168.7.211',
  user: 'umbrel',
};

class JellyfinLyricsCleanup {
  constructor() {
    this.accessToken = null;
    this.userId = null;
  }

  async authenticate() {
    console.log('🔐 Authenticating with Jellyfin...');

    const authUrl = `${JELLYFIN_CONFIG.serverUrl}/Users/authenticatebyname`;
    const authData = {
      Username: JELLYFIN_CONFIG.username,
      Pw: JELLYFIN_CONFIG.password,
    };

    try {
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Authorization':
            'MediaBrowser Client="LyricsCleanup", Device="Script", DeviceId="cleanup-script", Version="1.0.0"',
        },
        body: JSON.stringify(authData),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      this.accessToken = result.AccessToken;
      this.userId = result.User.Id;

      console.log('✅ Authentication successful');
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      process.exit(1);
    }
  }

  async getMusicLibraries() {
    console.log('📚 Getting music libraries...');

    const url = `${JELLYFIN_CONFIG.serverUrl}/Users/${this.userId}/Views`;

    try {
      const response = await fetch(url, {
        headers: {
          'X-Emby-Authorization': `MediaBrowser Token="${this.accessToken}"`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get libraries: ${response.status}`);
      }

      const result = await response.json();
      const musicLibraries = result.Items.filter((item) => item.CollectionType === 'music');

      console.log(`📁 Found ${musicLibraries.length} music libraries`);
      return musicLibraries;
    } catch (error) {
      console.error('❌ Failed to get music libraries:', error.message);
      throw error;
    }
  }

  async getAllSongs(libraryId) {
    console.log(`🎵 Getting all songs from library ${libraryId}...`);

    const url = `${JELLYFIN_CONFIG.serverUrl}/Users/${this.userId}/Items`;
    const params = new URLSearchParams({
      ParentId: libraryId,
      IncludeItemTypes: 'Audio',
      Recursive: 'true',
      Fields: 'Path,MediaSources',
      Limit: '10000', // Adjust if you have more than 10k songs
    });

    try {
      const response = await fetch(`${url}?${params}`, {
        headers: {
          'X-Emby-Authorization': `MediaBrowser Token="${this.accessToken}"`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get songs: ${response.status}`);
      }

      const result = await response.json();
      console.log(`🎶 Found ${result.Items.length} songs`);
      return result.Items;
    } catch (error) {
      console.error('❌ Failed to get songs:', error.message);
      throw error;
    }
  }

  convertJellyfinPathToSystemPath(jellyfinPath) {
    // Convert /downloads path to actual system path
    if (jellyfinPath.startsWith('/downloads')) {
      return jellyfinPath.replace('/downloads', '/home/umbrel/umbrel/home/Downloads');
    }
    return jellyfinPath;
  }

  async findLyricFiles(songPath) {
    const systemPath = this.convertJellyfinPathToSystemPath(songPath);
    const directory = systemPath.substring(0, systemPath.lastIndexOf('/'));
    const filename = systemPath.substring(systemPath.lastIndexOf('/') + 1);
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));

    // Look for .txt and .lrc files with the same name as the song
    const sshCommand = `ssh ${SSH_CONFIG.user}@${SSH_CONFIG.host} "find '${directory}' -name '${nameWithoutExt}.*' \\( -name '*.txt' -o -name '*.lrc' \\) 2>/dev/null || true"`;

    try {
      const { stdout } = await execAsync(sshCommand);
      const files = stdout
        .trim()
        .split('\n')
        .filter((f) => f.length > 0);

      return {
        txtFiles: files.filter((f) => f.endsWith('.txt')),
        lrcFiles: files.filter((f) => f.endsWith('.lrc')),
      };
    } catch (error) {
      // Ignore errors for individual files (might be permission issues, etc.)
      return { txtFiles: [], lrcFiles: [] };
    }
  }

  async hasTimings(lrcFilePath) {
    // Check if LRC file has timing information
    const sshCommand = `ssh ${SSH_CONFIG.user}@${SSH_CONFIG.host} "head -20 '${lrcFilePath}' 2>/dev/null | grep -E '\\[[0-9]{2}:[0-9]{2}\\.[0-9]{2}\\]' | wc -l"`;

    try {
      const { stdout } = await execAsync(sshCommand);
      const timingCount = parseInt(stdout.trim());
      return timingCount > 0;
    } catch (error) {
      return false;
    }
  }

  async deleteTxtFile(filePath) {
    const sshCommand = `ssh ${SSH_CONFIG.user}@${SSH_CONFIG.host} "rm -f '${filePath}'"`;

    try {
      await execAsync(sshCommand);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete ${filePath}:`, error.message);
      return false;
    }
  }

  async processLibrary(library) {
    console.log(`\n🎯 Processing library: ${library.Name}`);

    const songs = await this.getAllSongs(library.Id);
    let processedCount = 0;
    let deletedCount = 0;
    let skippedCount = 0;

    for (const song of songs) {
      processedCount++;

      if (processedCount % 100 === 0) {
        console.log(`📊 Processed ${processedCount}/${songs.length} songs...`);
      }

      try {
        const lyricFiles = await this.findLyricFiles(song.Path);

        if (lyricFiles.txtFiles.length === 0) {
          continue; // No .txt files to process
        }

        // Check if there are .lrc files with timings
        let hasTimedLrc = false;
        for (const lrcFile of lyricFiles.lrcFiles) {
          if (await this.hasTimings(lrcFile)) {
            hasTimedLrc = true;
            break;
          }
        }

        // Delete .txt files if we have timed .lrc files
        if (hasTimedLrc) {
          for (const txtFile of lyricFiles.txtFiles) {
            console.log(`🗑️  Deleting: ${txtFile}`);
            if (await this.deleteTxtFile(txtFile)) {
              deletedCount++;
            }
          }
        } else {
          skippedCount += lyricFiles.txtFiles.length;
          console.log(
            `⏭️  Skipping ${lyricFiles.txtFiles.length} .txt file(s) for: ${song.Name} (no timed .lrc found)`,
          );
        }
      } catch (error) {
        console.error(`❌ Error processing ${song.Name}:`, error.message);
      }
    }

    console.log(`\n📈 Library "${library.Name}" Summary:`);
    console.log(`   • Songs processed: ${processedCount}`);
    console.log(`   • .txt files deleted: ${deletedCount}`);
    console.log(`   • .txt files skipped: ${skippedCount}`);
  }

  async run() {
    console.log('🚀 Starting Jellyfin lyrics cleanup...\n');

    try {
      // Test SSH connection first
      console.log('🔗 Testing SSH connection...');
      await execAsync(`ssh ${SSH_CONFIG.user}@${SSH_CONFIG.host} "echo 'SSH connection successful'"`);
      console.log('✅ SSH connection verified\n');

      await this.authenticate();
      const musicLibraries = await this.getMusicLibraries();

      if (musicLibraries.length === 0) {
        console.log('⚠️  No music libraries found');
        return;
      }

      for (const library of musicLibraries) {
        await this.processLibrary(library);
      }

      console.log('\n🎉 Cleanup completed successfully!');
    } catch (error) {
      console.error('💥 Script failed:', error.message);
      process.exit(1);
    }
  }
}

// Check if required environment variables are set
if (!JELLYFIN_CONFIG.username || !JELLYFIN_CONFIG.password) {
  console.error('❌ Please set JELLYFIN_SERVER_USERNAME and JELLYFIN_SERVER_PASSWORD environment variables');
  process.exit(1);
}

// Run the cleanup
const cleanup = new JellyfinLyricsCleanup();
cleanup.run();
