# AtomQuest Support Portal

Real-time support platform where agents and customers connect via browser for live communication, file sharing, and session recording. Built for the AtomQuest Hackathon 2026 finale.

## What Is This?

A working support system where support agents can create sessions and customers join with a token. Once connected, both see each other on video, chat in real-time, share files, and optionally record. Everything runs in the browser—no downloads needed.

The main idea is keeping media routing under your control. Instead of third-party APIs, all audio and video flows through a MediaSoup server on your machine. This gives you privacy, full control over the data, and makes it simple to record or audit sessions later.

## Quick Start

### Requirements

- Node.js 14+
- npm
- A modern browser (Chrome, Firefox, Safari, or Edge)

### Setup

```bash
npm install
npm start
```

Server runs at `http://localhost:3000`. Override the port:

```bash
PORT=5000 npm start
```

## Using It

### Agent Side

1. Go to the home page
2. Enter your name and customer name
3. Click "Create Support Session"
4. Copy the token that appears and send it to the customer
5. Wait for the customer to join

### Customer Side

1. Go to the home page
2. Enter your name and the token
3. Click "Join Session"
4. Video call starts immediately

### During the Call

Both people can:
- Toggle audio and video
- Send chat messages (saved in history)
- Upload and share files
- Record the session
- See who's connected and when they joined

### Admin View

Visit `/admin.html` to see all sessions, who participated, what was shared, and download recordings.

## What's Inside

```
server.js              Express + Socket.IO + MediaSoup backend
public/
  index.html          Home page (create or join)
  call.html           Live call interface
  admin.html          Dashboard
  styles.css          Styling
  client.js           Session creation logic
  call.js             WebRTC and media handling
  admin.js            Dashboard logic
uploads/              Files shared during sessions
recordings/           Saved call recordings
data.db              SQLite database (auto-created)
architecture-diagram.svg    System overview
PROJECT_REPORT.md    Detailed technical documentation
```

## How It Works

The flow is straightforward:

1. Agent creates a session → server generates unique token
2. Customer joins with token → server looks it up
3. Both browsers connect to server via Socket.IO
4. Server creates WebRTC transports for each person
5. Audio and video flow through MediaSoup
6. Chat, files, and metadata get stored in SQLite
7. Recordings are uploaded and saved locally

The key piece is MediaSoup—it's a WebRTC SFU (Selective Forwarding Unit). Instead of a peer-to-peer connection, all media goes through the server. This is better for control, security, and recording.

## Architecture

- **Browsers** (Agent & Customer): WebRTC client, Socket.IO signaling, camera/mic
- **Server**: Express, Socket.IO handlers, session management
- **MediaSoup**: Routes audio and video, handles codecs
- **SQLite**: Stores sessions, chat, files, recordings

See `architecture-diagram.svg` for a visual.

## Tech Stack

- Node.js with Express
- Socket.IO for real-time signaling
- MediaSoup for WebRTC media routing
- SQLite for persistence
- Multer for file uploads
- Vanilla JavaScript (no frontend frameworks)

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/session` | POST | Create new session |
| `/api/session/:token` | GET | Look up session by token |
| `/api/session/:id/history` | GET | Get full session history |
| `/api/sessions` | GET | List all sessions |
| `/api/metrics` | GET | Active sessions & participants |
| `/api/session/:id/upload` | POST | Upload file during session |
| `/api/session/:id/recording` | POST | Upload recording |
| `/api/session/:id/end` | POST | End session |

## Features

**Core:**
- Browser-based video and audio with mute/video controls
- Persistent chat during and after calls
- File upload and sharing
- Session recording via browser MediaRecorder
- Admin dashboard for reviewing sessions
- Session history with participant names, times, and metadata

**Under the Hood:**
- Real-time signaling via Socket.IO
- Server-mediated media routing
- Automatic reconnection (18-second grace period)
- SQLite storage for everything
- Responsive UI that works on desktop and mobile

## Constraints

- Built for small teams, not enterprise scale
- Files and recordings stored locally (no cloud integration)
- No authentication yet (fine for hackathon, add for production)
- SQLite is local (back it up for production)
- Vercel won't work because this needs a persistent Node process and local filesystem
- External access needs a public server or tunnel

## Deploying It

For a real deployment, use a VPS or VM:

- DigitalOcean, AWS EC2, Azure VM, Google Cloud, or Linode
- Allow UDP ports 20000-20200 (MediaSoup needs these)
- Use HTTPS
- Back up the database and file folders

## Developing

**Adding features:**
- Backend: Edit `server.js` for new endpoints or Socket.IO handlers
- Frontend: Update HTML files and their paired JS files
- Database: Modify `initDatabase()` in `server.js` to add tables

**Debugging:**
- Check server logs in terminal
- Open browser DevTools (F12) for client-side issues
- Use SQLite tools to inspect the database if needed

## Known Limitations and Future Work

- No user authentication (should add for production)
- File upload validation is minimal
- Recording quality depends on browser implementation
- Mobile UX could be polished more
- Could add call queue or transfer features for production use

## Testing

Tested for:
- Session creation and token generation
- Customer join with token
- Audio/video call setup
- Chat and history
- File upload and download
- Recording capture
- Admin dashboard
- API responses

Run `npm start` and test manually in the browser.

## Troubleshooting

**Video/audio not working?**
- Check browser permissions for camera and mic
- Try a different browser
- Refresh the page

**Can't connect to session?**
- Make sure server is running (`npm start`)
- Check the token is correct
- Try creating a new session

**What if it crashes?**
- Check the terminal for error messages
- Restart the server
- Look at browser console (F12) for client errors

## More Info

See `PROJECT_REPORT.md` for detailed technical documentation. Check `architecture-diagram.svg` for a system overview.

---

AtomQuest Hackathon 2026