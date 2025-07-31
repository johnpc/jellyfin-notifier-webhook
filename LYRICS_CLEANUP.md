# Jellyfin Lyrics Cleanup Scripts

These scripts help clean up lyrics files in your Jellyfin music library by:

1. **Removing .txt lyric files** when timed .lrc files are available
2. **Downloading synced lyrics** from lrclib.net when no timed .lrc files exist
3. **Keeping only timed .lrc files** for the best lyrics experience

## Prerequisites

1. **SSH Access**: The scripts need SSH access to your Jellyfin server
2. **Environment Variables**: Set up your Jellyfin credentials in `.env`
3. **Node.js**: Ensure you have Node.js and npm installed

## Setup

1. Make sure your `.env` file contains:

```env
JELLYFIN_SERVER_URL=https://your-jellyfin-server.com
JELLYFIN_SERVER_USERNAME=your_username
JELLYFIN_SERVER_PASSWORD=your_password
```

2. Install dependencies:

```bash
npm install
```

## Scripts

### Test Script (Single Song)

```bash
npm run cleanupLyrics
```

This script processes only the first song in your music library. Use this to:

- Test the connection to your Jellyfin server
- Verify SSH access to the file system
- See how the script works before running on all songs

### Full Cleanup Script (All Songs)

```bash
npm run cleanupLyricsAll
```

This script processes all songs in your music library. It will:

- Walk through every song in all music libraries
- Check for existing .txt and .lrc lyric files
- Download synced lyrics from lrclib.net if no timed .lrc exists
- Delete .txt files when timed .lrc files are available
- Provide progress updates every 50 songs

## How It Works

### Path Mapping

The script converts Jellyfin paths to system paths:

- Jellyfin path: `/downloads/music/Artist/Album/Song.flac`
- System path: `/home/umbrel/umbrel/home/Downloads/music/Artist/Album/Song.flac`

### Lyric File Detection

For each song, the script looks for files with the same name but different extensions:

- `Song.txt` (plain text lyrics)
- `Song.lrc` (LRC format, may or may not have timings)

### Timing Detection

The script checks .lrc files for timing information by looking for patterns like:

```
[00:12.34]Lyric line with timing
```

### lrclib.net Integration

When no timed .lrc file exists, the script searches lrclib.net using:

- Track name
- Artist name
- Album name (if available)
- Duration (if available)

### File Operations

- **Download**: Saves synced lyrics from lrclib.net as .lrc files
- **Delete**: Removes .txt files when timed .lrc files are available
- **Skip**: Keeps .txt files when no timed .lrc alternative exists

## Output Examples

### Single Song Test

```
🚀 Starting Jellyfin lyrics cleanup (single song test)...

🔗 Testing SSH connection...
✅ SSH connection verified

🔐 Authenticating with Jellyfin...
✅ Authentication successful
📚 Getting music libraries...
📁 Found 1 music libraries
📚 Using library: Music

🎵 Processing: "That's Right"
📁 Path: /downloads/music/Artist/Album/Song.flac
📄 Found 0 .txt file(s) and 1 .lrc file(s)
✅ Found timed LRC file: /path/to/song.lrc
ℹ️  No .txt files to process

🎉 Single song test completed!
```

### Full Library Processing

```
🚀 Starting Jellyfin lyrics cleanup (all songs)...

🎯 Processing library: Music
🎵 Getting all songs from library...
🎶 Found 5,432 total songs

🚀 Starting to process 5,432 songs...

📥 [1/5432] Downloaded synced lyrics for: "Song Title"
🗑️  [2/5432] Deleted 1 .txt file(s) for: "Another Song"
📊 Progress: 50/5432 songs processed
   • Downloaded: 12, Deleted: 8, Skipped: 5

📈 Library "Music" Summary:
   • Songs processed: 5,432
   • Synced lyrics downloaded: 234
   • .txt files deleted: 156
   • .txt files skipped: 89

🎉 Cleanup completed successfully!
```

## Safety Features

- **Non-destructive**: Only deletes .txt files when timed .lrc alternatives exist
- **Error handling**: Continues processing even if individual songs fail
- **Progress tracking**: Shows progress and statistics
- **SSH verification**: Tests SSH connection before starting
- **Authentication check**: Verifies Jellyfin credentials before processing

## Troubleshooting

### SSH Connection Issues

```bash
# Test SSH connection manually
ssh umbrel@192.168.7.211 "echo 'test'"
```

### Authentication Issues

- Verify your Jellyfin credentials in `.env`
- Check that your Jellyfin server is accessible

### Permission Issues

- Ensure the SSH user has read/write access to the music directory
- Check file permissions on the target directory

### Rate Limiting

The script includes small delays to avoid overwhelming:

- lrclib.net API (respectful usage)
- SSH connections (100ms delay every 10 songs)
- Jellyfin API (pagination with reasonable limits)

## File Structure

```
jellyfin-message/
├── cleanup-lyrics.ts          # Single song test script
├── cleanup-lyrics-all.ts      # Full library cleanup script
├── LYRICS_CLEANUP.md          # This documentation
└── package.json               # NPM scripts configuration
```

## Notes

- The script respects existing timed .lrc files and won't overwrite them
- Plain .lrc files without timings are treated the same as .txt files
- The script only processes audio files recognized by Jellyfin
- Progress is logged to help monitor long-running operations
- All operations are logged for troubleshooting
