# AtomQuest Support Portal

A polished real-time support app built for the AtomQuest Hackathon finale. The project enables browser-based support sessions with live video, chat, file sharing, session recording, and a simple admin panel.

## Setup

### Requirements
- Node.js 14+ and npm
- Modern browser with WebRTC support (Chrome, Edge, Firefox, Safari)

### Install
```bash
npm install
```

### Run
```bash
npm start
```

Open the app at `http://localhost:3000` or the port set in `PORT`.

## How it works
- The agent creates a support session and shares a token with the customer.
- The customer joins using the token.
- Browsers connect to the server using Socket.IO.
- Media is routed through MediaSoup on the server.
- The session supports chat, file upload, and recording.

## Main Files
- `server.js` — backend server, Socket.IO, MediaSoup routing
- `public/index.html` — entry and session creation page
- `public/call.html` — live call interface
- `public/admin.html` — admin dashboard
- `public/client.js` — session creation and join logic
- `public/call.js` — WebRTC and call management
- `uploads/` — shared files storage
- `recordings/` — saved session recordings
- `data.db` — local SQLite storage
- `architecture-diagram.svg` — architecture visualization

## Known limitations
- Designed for small teams and local deployment, not large-scale production traffic.
- Files and recordings are stored locally in the repository folders.
- External access requires a public server, reverse proxy, or tunnel.
- Vercel is not suitable because this app requires a persistent Node server, MediaSoup worker, and local filesystem storage.

## Can I deploy on Vercel?
No. Vercel is built for static sites and serverless functions. This app needs a long-running Node process, MediaSoup routing, and local file storage, so a VPS or cloud VM is a better choice.

## Quick functionality check
This app is intended to support:
- session creation by agent
- customer join via token
- browser-based audio/video call
- in-call chat
- file upload during a session
- session recording and download
- admin dashboard session view

If anything fails, restart the server with `npm start` and verify the browser console.

## Deployment note
For a deployable server, use a VPS or cloud instance that allows:
- long-running Node.js processes
- UDP port range 20000-20200 for MediaSoup
- HTTPS or secure access if exposed publicly

## Architecture overview
The app includes:
- `Express` for static files and APIs
- `Socket.IO` for real-time signaling
- `MediaSoup` for server-side audio/video routing
- `SQLite` for session history and asset tracking

Session flow:
1. Agent creates session and token.
2. Customer enters token on join page.
3. Both connect to the server through Socket.IO.
4. Media transports are established.
5. Audio/video flows through MediaSoup.
6. Chat and uploads are stored on the server.
7. Recordings are saved locally.
- Database queries can be optimized with proper indexing
- File sizes limited by multer configuration

### Security Considerations
- All media routes through your server (not peer-to-peer)
- SQLite database is local; implement backup strategy for production
- Consider adding authentication layer for admin dashboard
- Sanitize file uploads in production

## 🎓 Learning Resources

This project demonstrates:
- ✅ WebRTC fundamentals with server-mediated routing
- ✅ Socket.IO real-time communication patterns
- ✅ MediaSoup media server configuration
- ✅ Database design for session persistence
- ✅ Responsive CSS Grid layouts
- ✅ Modern JavaScript async/await patterns
- ✅ Error handling and user feedback

## �‍💻 Support

For issues or questions about this project, please refer to:
- `architecture-diagram.svg` for technical visualization
- Server logs (console output)
- Browser developer tools (F12) for client-side debugging

---

**AtomQuest Hackathon 2026** - Building the future of customer support 🚀

