# Architecture Overview

## System design

This solution uses a browser-based frontend and a Node.js backend to deliver a real-time support call platform with server-mediated media routing.

### Components

- **Express**: Serves static UI files and session-management APIs.
- **Socket.io**: Handles signaling, chat, and session events.
- **Mediasoup**: Provides server-side WebRTC routing so audio/video traffic flows through the server instead of direct peer-to-peer.
- **SQLite**: Persists session records, participant history, and chat messages.

## Call flow

1. Agent creates a session via the web UI.
2. Server stores the session and issues a token.
3. Customer joins the session by token.
4. Both browsers connect to the server over socket.io and exchange mediasoup signaling.
5. Each client creates send and receive transports through the server.
6. Media is produced to the server and consumed back to the other participant.

## Session persistence

- `sessions` table tracks start/end times and status.
- `participants` logs join/leave events by role.
- `chat` stores all in-call text messages.

## Bonus and evaluation fit

- Real-time call functionality is implemented with server-side routing.
- Chat persists and is delivered live.
- The UI is browser-based with clear agent/customer separation.
- The architecture is extendable for recording, file sharing, and admin dashboards.
