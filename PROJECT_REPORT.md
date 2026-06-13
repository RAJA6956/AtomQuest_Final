# AtomQuest Support Portal

## 1. Executive Summary

AtomQuest Support Portal is a browser-based real-time support application built for the AtomQuest Hackathon 2026 finale. The system delivers live agent-customer video sessions, secure chat, file sharing, session recording, and auditing capabilities. The project emphasizes a professional support workflow, server-mediated WebRTC routing, and self-hosted persistence.

## 2. Problem Statement

Modern technical support requires fast, reliable communication between customers and support agents. Off-the-shelf systems can expose sensitive data, rely on third-party media servers, or force users to install apps. The goal of this project is to create a polished support portal that:

- enables quick session creation and secure customer join via token
- supports browser-based video, audio, chat, and file sharing
- captures session data for future review and accountability
- keeps media routing under direct server control
- delivers a simple admin interface for session monitoring

## 3. Solution Overview

The AtomQuest Support Portal solves these needs with a full-stack Node.js application. It combines:

- `Express` for static hosting and REST APIs
- `Socket.IO` for signaling and session coordination
- `MediaSoup` for server-side WebRTC media routing
- `SQLite` for persistent session, chat, file, and recording data
- Browser-based UI for agent, customer, and admin workflows

The result is a secure, realistic support platform that works in modern browsers without installing software.

## 4. Architecture

### 4.1 System Components

The architecture contains four main components:

1. **Agent Browser**
   - Session creation and media negotiation UI
   - Sends local audio/video data
   - Receives remote participant media

2. **Customer Browser**
   - Join page and live call UI
   - Enters a session token to connect
   - Participates in video, chat, file sharing, and recordings

3. **Server**
   - Hosts the frontend pages and API endpoints
   - Manages session tokens, participants, and persistence
   - Runs a MediaSoup worker to orchestrate media flows

4. **Persistence Storage**
   - SQLite database stores session metadata, chat, files, and recordings
   - `uploads/` stores shared files
   - `recordings/` stores saved call recordings

### 4.2 Architecture Diagram

The diagram is available in the project as `architecture-diagram.svg`. It shows the agent browser and customer browser connecting to the Node.js server, which routes media through MediaSoup and writes session assets to local storage.

### 4.3 Data Flow

- Agent creates a new session and receives a unique token.
- Customer enters the token to join the session.
- Both clients establish a Socket.IO connection to the server.
- The server creates a MediaSoup router and transports for each user.
- Browser audio/video streams are produced and consumed through the server.
- Chat messages, file uploads, and recording metadata are stored in SQLite.
- Recordings are saved in the `recordings/` folder via browser upload.

## 5. Key Features

### 5.1 Support Session Management

- Agent creates session with agent and customer names.
- Customer joins session using a secure token.
- Sessions can be monitored from the admin dashboard.

### 5.2 Real-Time Audio and Video

- WebRTC media is routed through MediaSoup.
- Supports both audio and video tracks.
- Includes mute/unmute and video on/off controls.

### 5.3 Live Chat

- In-call chat is available for both participants.
- Messages are stored persistently in SQLite.
- Chat history can be replayed from session history.

### 5.4 File Sharing

- Participants can share files during a session.
- Files are saved to `uploads/` and referenced in session history.
- File sharing updates are broadcast in real time.

### 5.5 Session Recording

- Browser-based recording is supported.
- Recordings are uploaded to the server and stored locally.
- Participants receive recording-ready notifications.

### 5.6 Admin Dashboard

- Displays active and completed sessions.
- Provides metrics for sessions and participants.
- Supports reviewing session metadata, chat, and file assets.

## 6. Technology Stack

- Node.js
- Express
- Socket.IO
- MediaSoup
- SQLite3
- Multer
- UUID
- Vanilla JavaScript
- HTML/CSS

## 7. Implementation Highlights

### 7.1 Backend

- `server.js` initializes Express, Socket.IO, and MediaSoup.
- The backend creates and manages rooms, transports, producers, and consumers.
- SQLite tables are used for sessions, participants, chat, files, and recordings.
- API endpoints provide session history, metrics, and file/recording uploads.
- File upload handlers sanitize filenames and store metadata.

### 7.2 Frontend

- `public/index.html` starts the agent or customer flow.
- `public/call.html` provides the live call interface.
- `public/admin.html` displays metrics and session lists.
- `public/client.js` handles session creation and join logic.
- `public/call.js` manages WebRTC signaling and media.
- UI controls include camera/audio toggles, chat input, and upload buttons.

## 8. Testing and Verification

### 8.1 Functional Check

- Verified backend API endpoints responded successfully:
  - `/api/metrics` → HTTP `200`
  - `/api/sessions` → HTTP `200`
- Confirmed home and admin pages loaded with core UI elements.
- Confirmed the README update and architecture diagram were present.

### 8.2 Important Scenarios

- Agent session creation
- Customer token-based join
- Video/audio call establishment
- Chat messaging
- File upload handling
- Recording upload processing
- Admin dashboard session overview

## 9. Deployment Considerations

### 9.1 Suitable Environment

This project is best deployed on a server or VM that supports long-running Node.js processes and local storage. Recommended environments include:
- DigitalOcean Droplet
- AWS EC2
- Azure VM
- Google Cloud VM

### 9.2 Not Suitable for Vercel

Vercel is not appropriate because the app depends on:
- a persistent Node.js server
- MediaSoup worker with UDP ports
- local filesystem storage for files and recordings

### 9.3 Production Notes

- Use HTTPS for public deployments.
- Configure firewall rules to allow UDP ports `20000-20200`.
- Add authentication for the admin dashboard.
- Implement backups for `data.db`, `uploads/`, and `recordings/`.

## 10. Known Limitations

- Local storage is not scalable for high-volume use.
- The current implementation is not production hardened.
- No authentication or role-based access control exists yet.
- File uploads are not validated beyond filename sanitization.
- The app is optimized for small support sessions, not enterprise scale.

## 11. Future Enhancements

- Add login and authentication for agents and admins.
- Implement secure storage and cloud backups.
- Add session recording playback in the admin panel.
- Add support for multiple concurrent customer support sessions per agent.
- Improve UI polish and mobile experience.
- Add performance monitoring and logging.

## 12. Conclusion

AtomQuest Support Portal demonstrates a complete end-to-end real-time support experience. It combines server-side media routing with client-side browser access, persistent session tracking, and a modern support workflow. The architecture is clear and extensible, making it a strong submission for the AtomQuest finale.

---

*Project report generated using the current codebase and project design details.*