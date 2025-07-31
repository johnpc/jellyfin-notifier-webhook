#!/usr/bin/env tsx

import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from 'dotenv';

// Load environment variables
config();

const execAsync = promisify(exec);

// Configuration
const JELLYFIN_CONFIG = {
  serverUrl: process.env.JELLYFIN_SERVER_URL || 'http://192.168.7.211:8096',
  username: process.env.JELLYFIN_SERVER_USERNAME!,
  password: process.env.JELLYFIN_SERVER_PASSWORD!,
};

const SSH_CONFIG = {
  host: '192.168.7.211',
  user: 'umbrel',
};

interface JellyfinAuthResponse {
  AccessToken: string;
  User: { Id: string };
}

interface JellyfinItem {
  Id: string;
  Name: string;
  Path: string;
  Album?: string;
  AlbumArtist?: string;
  Artists?: string[];
  RunTimeTicks?: number;
  CollectionType?: string;
}

interface JellyfinItemsResponse {
  Items: JellyfinItem[];
  TotalRecordCount: number;
}

interface LrcLibResponse {
  id: number;
  name: string;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  plainLyrics: string;
  syncedLyrics: string;
}

class JellyfinLyricsCleanup {
  private accessToken: string | null = null;
  private userId: string | null = null;

  async authenticate(): Promise<void> {
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

      const result: JellyfinAuthResponse = await response.json();
      this.accessToken = result.AccessToken;
      this.userId = result.User.Id;

      console.log('✅ Authentication successful');
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      process.exit(1);
    }
  }

  async getMusicLibraries(): Promise<JellyfinItem[]> {
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

      const result: JellyfinItemsResponse = await response.json();
      const musicLibraries = result.Items.filter((item) => item.CollectionType === 'music');

      console.log(`📁 Found ${musicLibraries.length} music libraries`);
      return musicLibraries;
    } catch (error) {
      console.error('❌ Failed to get music libraries:', error);
      throw error;
    }
  }

  async getAllSongs(libraryId: string): Promise<JellyfinItem[]> {
    console.log(`🎵 Getting all songs from library ${libraryId}...`);

    const allSongs: JellyfinItem[] = [];
    let startIndex = 0;
    const limit = 1000;

    while (true) {
      const url = `${JELLYFIN_CONFIG.serverUrl}/Users/${this.userId}/Items`;
      const params = new URLSearchParams({
        ParentId: libraryId,
        IncludeItemTypes: 'Audio',
        Recursive: 'true',
        Fields: 'Path,MediaSources,Album,AlbumArtist,Artists,RunTimeTicks',
        StartIndex: startIndex.toString(),
        Limit: limit.toString(),
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

        const result: JellyfinItemsResponse = await response.json();
        allSongs.push(...result.Items);

        if (result.Items.length < limit) {
          break; // No more items
        }

        startIndex += limit;
        console.log(`📊 Retrieved ${allSongs.length} songs so far...`);
      } catch (error) {
        console.error('❌ Failed to get songs:', error);
        throw error;
      }
    }

    console.log(`🎶 Found ${allSongs.length} total songs`);
    return allSongs;
  }

  convertJellyfinPathToSystemPath(jellyfinPath: string): string {
    // Convert /downloads path to actual system path
    if (jellyfinPath.startsWith('/downloads')) {
      return jellyfinPath.replace('/downloads', '/home/umbrel/umbrel/home/Downloads');
    }
    return jellyfinPath;
  }

  async findLyricFiles(songPath: string): Promise<{ txtFiles: string[]; lrcFiles: string[] }> {
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
      // Silently ignore errors for individual files
      return { txtFiles: [], lrcFiles: [] };
    }
  }

  async hasTimings(lrcFilePath: string): Promise<boolean> {
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

  async searchLrcLib(song: JellyfinItem): Promise<LrcLibResponse | null> {
    const trackName = song.Name;
    const artistName = song.Artists?.[0] || song.AlbumArtist || '';
    const albumName = song.Album || '';
    const duration = song.RunTimeTicks ? Math.round(song.RunTimeTicks / 10000000) : undefined;

    try {
      const params = new URLSearchParams({
        track_name: trackName,
        artist_name: artistName,
        ...(albumName && { album_name: albumName }),
        ...(duration && { duration: duration.toString() }),
      });

      const response = await fetch(`https://lrclib.net/api/search?${params}`, {
        headers: {
          'User-Agent': 'JellyfinLyricsCleanup/1.0.0',
        },
      });

      if (!response.ok) {
        return null;
      }

      const results: LrcLibResponse[] = await response.json();

      if (results.length === 0) {
        return null;
      }

      // Find the best match (first result with synced lyrics)
      const syncedResult = results.find((r) => r.syncedLyrics);
      return syncedResult || null;
    } catch (error) {
      return null;
    }
  }

  async saveLrcFile(songPath: string, lrcContent: string): Promise<boolean> {
    const systemPath = this.convertJellyfinPathToSystemPath(songPath);
    const directory = systemPath.substring(0, systemPath.lastIndexOf('/'));
    const filename = systemPath.substring(systemPath.lastIndexOf('/') + 1);
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const lrcPath = `${directory}/${nameWithoutExt}.lrc`;

    // Escape single quotes in the content for the SSH command
    const escapedContent = lrcContent.replace(/'/g, "'\"'\"'");

    const sshCommand = `ssh ${SSH_CONFIG.user}@${SSH_CONFIG.host} "echo '${escapedContent}' > '${lrcPath}'"`;

    try {
      await execAsync(sshCommand);
      return true;
    } catch (error) {
      return false;
    }
  }

  async deleteTxtFile(filePath: string): Promise<boolean> {
    const sshCommand = `ssh ${SSH_CONFIG.user}@${SSH_CONFIG.host} "rm -f '${filePath}'"`;

    try {
      await execAsync(sshCommand);
      return true;
    } catch (error) {
      return false;
    }
  }

  async processSong(
    song: JellyfinItem,
    index: number,
    total: number,
  ): Promise<{ deleted: number; downloaded: number; skipped: number }> {
    const result = { deleted: 0, downloaded: 0, skipped: 0 };

    try {
      const lyricFiles = await this.findLyricFiles(song.Path);

      if (lyricFiles.txtFiles.length === 0 && lyricFiles.lrcFiles.length === 0) {
        return result; // No lyric files at all
      }

      // Check if there are .lrc files with timings
      let hasTimedLrc = false;
      for (const lrcFile of lyricFiles.lrcFiles) {
        if (await this.hasTimings(lrcFile)) {
          hasTimedLrc = true;
          break;
        }
      }

      // If no timed LRC files, try to get one from lrclib
      if (!hasTimedLrc && (lyricFiles.txtFiles.length > 0 || lyricFiles.lrcFiles.length > 0)) {
        const lrcLibResult = await this.searchLrcLib(song);

        if (lrcLibResult && lrcLibResult.syncedLyrics) {
          if (await this.saveLrcFile(song.Path, lrcLibResult.syncedLyrics)) {
            hasTimedLrc = true;
            result.downloaded = 1;
            console.log(`📥 [${index}/${total}] Downloaded synced lyrics for: "${song.Name}"`);
          }
        }
      }

      // Delete .txt files
      if (lyricFiles.txtFiles.length > 0) {
        for (const txtFile of lyricFiles.txtFiles) {
          if (await this.deleteTxtFile(txtFile)) {
            result.deleted++;
          }
        }
        if (result.deleted > 0) {
          console.log(`🗑️  [${index}/${total}] Deleted ${result.deleted} .txt file(s) for: "${song.Name}"`);
        }
      } else if (lyricFiles.txtFiles.length > 0) {
        result.skipped = lyricFiles.txtFiles.length;
      }
    } catch (error) {
      console.error(`❌ [${index}/${total}] Error processing ${song.Name}:`, error);
    }

    return result;
  }

  async processLibrary(library: JellyfinItem): Promise<void> {
    console.log(`\n🎯 Processing library: ${library.Name}`);

    const songs = await this.getAllSongs(library.Id);
    let totalDeleted = 0;
    let totalDownloaded = 0;
    let totalSkipped = 0;

    console.log(`\n🚀 Starting to process ${songs.length} songs...\n`);

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      const result = await this.processSong(song, i + 1, songs.length);

      totalDeleted += result.deleted;
      totalDownloaded += result.downloaded;
      totalSkipped += result.skipped;

      // Progress update every 50 songs
      if ((i + 1) % 50 === 0) {
        console.log(`📊 Progress: ${i + 1}/${songs.length} songs processed`);
        console.log(`   • Downloaded: ${totalDownloaded}, Deleted: ${totalDeleted}, Skipped: ${totalSkipped}`);
      }

      // Small delay to avoid overwhelming the services
      if ((i + 1) % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`\n📈 Library "${library.Name}" Summary:`);
    console.log(`   • Songs processed: ${songs.length}`);
    console.log(`   • Synced lyrics downloaded: ${totalDownloaded}`);
    console.log(`   • .txt files deleted: ${totalDeleted}`);
    console.log(`   • .txt files skipped: ${totalSkipped}`);
  }

  async run(): Promise<void> {
    console.log('🚀 Starting Jellyfin lyrics cleanup (all songs)...\n');

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
      console.error('💥 Script failed:', error);
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
