# AtomQuest Real-Time Support Portal 🎥

A professional real-time video support platform built for the AtomQuest Hackathon 2026 Grand Finale. Enables support teams to conduct live video calls, share files, and maintain detailed session records—all with server-mediated WebRTC for enhanced privacy and control.

## 🎯 Features

### Core Capabilities
- **🎥 HD Video Calling** - Real-time video with server-mediated routing (via MediaSoup)
- **🎤 Crystal Clear Audio** - Opus codec with mute controls for professional communication
- **💬 Live Chat** - In-call text messaging with persistent message history
- **📁 File Sharing** - Share documents, screenshots, and files directly during calls
- **🎬 Session Recording** - Record entire calls for training and reference
- **📊 Session History** - Complete audit trail with participant logs, chat, and file records

### Technical Strengths
- **Server-Mediated Media Routing** - All media flows through your own server, not third-party APIs
- **Browser-Based** - No app installation required; works on any modern browser
- **Automatic Reconnection** - Handles temporary disconnects gracefully (18-second grace period)
- **SQLite Persistence** - All session data stored locally for easy auditing and compliance
- **Responsive Design** - Works beautifully on desktop, tablet, and mobile devices

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ and npm
- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)

### Installation
```bash
# Install dependencies
npm install

# Start the server
npm start
```

The server will start on `http://localhost:3000`

### Usage Flow

#### For Support Agents:
1. Enter your name and customer name
2. Click "Create Support Session"
3. Share the generated token with the customer
4. Wait for customer to join
5. Start the video call

#### For Customers:
1. Receive session token from support agent
2. Enter your name and paste the token
3. Click "Join Session"
4. Video call begins automatically

## 📁 Project Structure

```
.
├── server.js                 # Express server, MediaSoup worker, Socket.IO signaling
├── public/
│   ├── index.html           # Home page (session creation)
│   ├── call.html            # Call interface (video, chat, recording)
│   ├── admin.html           # Admin dashboard
│   ├── client.js            # Session creation flow & signaling
│   ├── call.js              # WebRTC media handling (MediaSoup client)
│   ├── admin.js             # Dashboard functionality
│   └── styles.css           # Professional UI styling
├── uploads/                 # File sharing storage
├── recordings/              # Session recordings storage
├── data.db                  # SQLite database (auto-created)
├── package.json
├── ARCHITECTURE.md          # Technical architecture details
└── README.md               # This file
```

## 🏗️ Architecture

### Components
- **Express** - HTTP server for static assets and REST APIs
- **Socket.IO** - Real-time signaling for WebRTC coordination
- **MediaSoup** - Server-side WebRTC media router (Opus audio, VP8 video)
- **SQLite3** - Local database for sessions, participants, chat, files, recordings
- **MediaSoup Client** - Browser-side media negotiation and transport

### Call Flow
1. **Session Creation** - Agent creates session, gets unique token
2. **Token Exchange** - Customer joins using token
3. **Connection Establishment** - Both connect to server via Socket.IO
4. **Media Negotiation** - WebRTC transports created for audio and video
5. **Media Routing** - Server routes both participants' streams through MediaSoup router
6. **Call Management** - Participants can mute, record, share files, and chat
7. **Recording** - Browser MediaRecorder captures both local and remote streams
8. **Session Cleanup** - Database records all interactions for history/audit

## 🎨 UI/UX Features

- **Professional Dark Theme** - Clean, modern interface with gradient accents
- **Intuitive Navigation** - Clear roles for agents and customers
- **Live Indicators** - Real-time participant status and recording feedback
- **Responsive Layout** - Automatically adapts to screen size
- **Accessibility** - Semantic HTML with proper labels and contrast ratios
- **Error Feedback** - User-friendly error messages with actionable guidance

## 🔒 Data Persistence

All session data is stored locally in SQLite:

```
sessions
├── id (UUID)
├── agentName
├── customerName
├── token (UUID)
├── createdAt
├── endedAt
└── status (active/ended)

participants
├── sessionId
├── role (agent/customer)
├── name
├── joinedAt
└── leftAt

chat
├── sessionId
├── sender
├── role
├── message
└── createdAt

files
├── sessionId
├── filename
├── originalName
├── sender
├── role
└── createdAt

recordings
├── sessionId
├── filename
├── originalName
└── createdAt
```

## 📊 Admin Dashboard

Access at `/admin.html` to:
- View all active and completed sessions
- See participant join/leave times
- Review chat history
- Access uploaded files
- Download session recordings
- View session duration and metadata

## ⚙️ Configuration

Environment variables:
```bash
PORT=3000           # Server port (default 3000)
NODE_ENV=production # production or development
```

MediaSoup Worker settings (in `server.js`):
- RTC Port Range: 20000-20200
- Audio Codec: Opus (48kHz, 2 channels)
- Video Codec: VP8 (90kHz)
- Initial Bitrate: 1 Mbps

## 🐛 Troubleshooting

### "Cannot access camera/microphone"
- Check browser permissions
- Ensure browser has camera/microphone access
- Try a different browser

### "Connection timeout"
- Check server is running (`npm start`)
- Verify correct port (default 3000)
- Check firewall/network settings

### "Session token invalid"
- Ensure token is copied correctly
- Token expires after session ends
- Create a new session if needed

### "Video not displaying"
- Check browser supports WebRTC
- Verify camera is working
- Try refreshing the page

## 📝 Development Notes

### Adding Features
- Backend changes: Modify `server.js` and add API endpoints
- Frontend changes: Update HTML files and corresponding JS files
- Database changes: Modify `initDatabase()` function in `server.js`

### Performance Optimization
- Media bitrate can be adjusted in `createWebRtcTransport()`
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

## 📄 License

MIT License - See LICENSE file for details

## 👨‍💻 Support

For issues or questions about this project, please refer to:
- ARCHITECTURE.md for technical details
- Server logs (console output)
- Browser developer tools (F12) for client-side debugging

---

**AtomQuest Hackathon 2026** - Building the future of customer support 🚀

