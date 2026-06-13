# AtomQuest Real-Time Support Platform - Complete Manual Testing Guide

## Overview
This guide provides step-by-step instructions to test all features of the AtomQuest Real-Time Support Platform. The platform enables real-time video support with chat, file sharing, and session recording.

**System Requirements:**
- Browser with WebRTC support (Chrome, Firefox, Edge, Safari)
- Microphone and camera access
- Two separate devices or browser windows/tabs for full testing

---

## 1. Starting the Server

### Prerequisites
- Node.js 14+ installed
- `npm` installed
- Dependencies installed: `npm install`

### Launch the Server
```bash
cd c:\Users\HP\Downloads\AtomQuest_Finale
npm start
```

**Expected Output:**
```
✓ MediaSoup worker started
✓ Server listening on http://localhost:3002
✓ Open browser to http://localhost:3002
```

The server will create:
- SQLite database (`data.db`)
- Directories for uploads and recordings

---

## 2. Feature Testing Checklist

### 2.1 Home Page (Session Creation & Join)

**URL:** http://localhost:3002/

#### Test 2.1.1: Create Support Session (Agent Side)
1. **Fill Agent Information:**
   - Enter your name/ID in "Agent Name" field (e.g., "John Support")
   - Enter customer name in "Customer Name" field (e.g., "Tech Corp")
   - Click **"✨ Create Support Session"** button

2. **Expected Results:**
   - Green checkmark: "✓ Session created successfully!"
   - Session token displayed in a code box
   - "📋 Copy" button appears to copy the token
   - "🚀 Go to Call" button appears (do NOT click yet - share token first!)

3. **Verify Token Copy:**
   - Click the "📋 Copy" button
   - Button text changes to "✓ Copied!" temporarily
   - Token is copied to clipboard (test by pasting in another field)

#### Test 2.1.2: Join Support Session (Customer Side)
1. **Open a New Browser Tab/Window** and go to http://localhost:3002/
2. **Fill Customer Information:**
   - Enter your name in "Your Name" field (e.g., "Customer Service")
   - Paste the token from agent into "Session Token" field
   - Click **"🔗 Join Session"** button

3. **Expected Results:**
   - Redirects to call page: `http://localhost:3002/call.html?token=<token>`
   - Video call interface loads
   - "Session active: John Support + Tech Corp" message appears
   - Participant list shows agent name

---

### 2.2 Call Page (Video & Audio Features)

**URL:** http://localhost:3002/call.html?token=`<your-token>`

#### Test 2.2.1: Media Permissions & Video Display
1. **Grant Permissions:**
   - Browser will prompt for camera and microphone access
   - Click "Allow" on all permission prompts

2. **Verify Local Video:**
   - Your video feed appears in "Your Stream" box
   - Video shows your face/camera input (or test pattern)

3. **Verify Remote Video:**
   - Wait 3-5 seconds
   - Remote participant video appears in "Remote Participant" box
   - Both participant names appear in "Participants:" list

#### Test 2.2.2: Mute Audio Button
1. **Initial State:**
   - Button shows "🎤 Mute Audio"
   - Audio track is enabled

2. **Click "🎤 Mute Audio":**
   - Button text changes to "🎤 Unmute Audio"
   - No audio is sent to remote participant (verify by speaking - they hear nothing)

3. **Click "🎤 Unmute Audio":**
   - Button text changes back to "🎤 Mute Audio"
   - Audio resumes (remote participant can hear you again)

#### Test 2.2.3: Video Toggle Button
1. **Initial State:**
   - Button shows "📹 Stop Video"
   - Your video feed is visible to others

2. **Click "📹 Stop Video":**
   - Button text changes to "📹 Start Video"
   - Your video disappears (remote sees black screen/no video)
   - Local preview may still show but is not sent

3. **Click "📹 Start Video":**
   - Button text changes back to "📹 Stop Video"
   - Video resumes (remote can see you again)

#### Test 2.2.4: Session Status Display
- At top of page, verify message: "Session active: [AgentName] + [CustomerName]"
- Shows both participants are connected
- If session ends, message changes to "This session has ended."

---

### 2.3 Chat Feature

**Location:** Bottom section "💬 In-Call Communication" → "Chat History"

#### Test 2.3.1: Send Chat Message
1. **From Agent:**
   - Type a message in chat input box (e.g., "Hello, how can I help?")
   - Press **Enter** or click **Send** button
   - Message appears in chat history with format: "[Name] (agent): [message]"

2. **From Customer:**
   - Type a message in chat input box
   - Press **Enter** or click **Send** button
   - Message appears with format: "[Name] (customer): [message]"
   - Both participants see the message immediately
   - Message is persistent (survives page refresh - stored in DB)

#### Test 2.3.2: Chat History Persistence
1. Send several messages
2. Click "🚪 Leave Session" or navigate away
3. Rejoin with same token
4. **Expected:** All previous messages still visible in chat history (loaded from database)

---

### 2.4 File Sharing Feature

**Location:** "Share Files" section (below chat)

#### Test 2.4.1: Upload File
1. **Select File:**
   - Click **"Choose File"** button
   - Select any file (e.g., PDF, image, text file) from your computer

2. **Upload:**
   - Click **"📤 Upload"** button
   - Status message shows: "Uploading file..."
   - Once complete: "File shared: [filename]"

3. **Verify File in Chat:**
   - File appears as clickable link in chat history
   - Format: "[Name] (role): [filename as link]"
   - Link opens file in new tab: `/uploads/<timestamp>-<filename>`

4. **Verify File in Database:**
   - Open Admin Dashboard (see Section 2.7)
   - View session history
   - File appears in "Files" section with timestamp

#### Test 2.4.2: Upload Multiple Files
1. Repeat 2.4.1 with different files
2. All files appear as separate links in chat
3. All files stored in `/uploads/` directory
4. Each file has unique timestamp prefix (no overwrites)

#### Test 2.4.3: Download Uploaded File
1. Click file link in chat history
2. **Expected:** File downloads or opens in new tab
3. Verify file content is correct (not corrupted)

---

### 2.5 Session Recording Feature

**Location:** "🎬 Session Recording" section (above chat)

#### Test 2.5.1: Start & Stop Recording (Agent Only)
1. **Verify:** Recording buttons only visible to agent (customer sees empty section)

2. **Start Recording:**
   - Click **"● Start Recording"** button
   - Status shows: "Recording in progress..."
   - "Start Recording" button becomes disabled
   - "Stop Recording" button becomes enabled

3. **Perform Actions While Recording:**
   - Speak into microphone
   - Move in front of camera
   - Send chat messages
   - Share files
   - All activity is captured

4. **Stop Recording:**
   - Click **"⏹ Stop Recording"** button
   - Status shows: "Uploading recording..."
   - Once complete: "Recording uploaded successfully."
   - "Stop Recording" button becomes disabled
   - "Start Recording" button becomes enabled again

5. **Verify Recording Link:**
   - Recording appears as clickable link: "Recording ready: [filename]"
   - Link opens in new tab: `/recordings/<timestamp>-<filename>`

#### Test 2.5.2: Recording Content
1. **Verify Recording Quality:**
   - Recording contains both audio and video
   - Duration = time between start and stop
   - Plays in browser or media player
   - Audio quality is clear

2. **Verify Recording in Admin Dashboard:**
   - Recording appears in session history under "Recordings" section
   - Shows original filename and creation timestamp

---

### 2.6 Session Control Features

#### Test 2.6.1: Token Display (Agent)
1. **Visible Only to Agent:**
   - "📋 Share this token with the customer:" section visible
   - Token displayed in code box
   - "📋 Copy" button allows easy sharing

2. **Share Token with Customer:**
   - Copy token from agent page
   - Paste into customer's "Session Token" field on home page
   - Customer joins successfully

#### Test 2.6.2: End Session (Agent Only)
1. **Agent Page Only:**
   - "🛑 End Session" button visible only on agent page
   - Button NOT visible on customer page

2. **Click "🛑 End Session":**
   - Confirmation dialog: "End this session for all participants?"
   - Click OK to confirm

3. **Expected Results:**
   - Both agent and customer pages redirect to home page
   - Database updated: session status = "ended", `endedAt` timestamp recorded
   - Customer receives notification (if they were on the page)
   - Admin can see "ended" status in session list

#### Test 2.6.3: Leave Session (Customer)
1. **Customer Page:**
   - Click **"🚪 Leave Session"** button
   - Page redirects to home immediately
   - Participant is marked as "left" in database

2. **Agent Page:**
   - Participant list updates (customer removed after 18-second grace window)
   - Agent can continue or end the session

#### Test 2.6.4: Session Disconnect & Reconnect (Grace Window)
1. **Simulate Disconnect:**
   - Participant navigates away from call page (go to home page)
   - Server starts 18-second grace period

2. **Rejoin Within Grace Window (<18 seconds):**
   - Rejoin using same token within 18 seconds
   - Participant rejoins seamlessly
   - Participant list shows them connected again
   - No data loss

3. **Rejoin After Grace Window (>18 seconds):**
   - Wait >18 seconds after disconnect
   - Rejoin using same token
   - New socket connection created (old one cleaned up)
   - Participant list may briefly update then restore

---

### 2.7 Admin Dashboard

**URL:** http://localhost:3002/admin.html

#### Test 2.7.1: View Active Sessions
1. **Open Admin Dashboard**
2. **Sessions Table Shows:**
   - Session ID
   - Agent Name
   - Customer Name
   - Join Token
   - Created Timestamp
   - Status (active/ended)
   - "View" button (session details)
   - "End" button (terminate session)

3. **Verify Real-Time Updates:**
   - Create new session on home page
   - Dashboard updates automatically OR click "🔄 Refresh" button
   - New session appears in table

#### Test 2.7.2: View Session History
1. **Click "View" Button on Any Session:**
   - Modal/panel opens showing detailed history:
     - Session metadata
     - Participants (join/leave timestamps)
     - Chat messages (with sender, timestamp)
     - Uploaded files (with links)
     - Recordings (with links)

2. **Verify Data:**
   - All chat messages visible
   - File links are clickable and functional
   - Recording links are clickable and functional
   - Timestamps match actual times

#### Test 2.7.3: End Session from Admin
1. **Click "End" Button on Active Session:**
   - Confirmation: "Are you sure?"
   - Session status updates to "ended"
   - If participants are online, they receive disconnection event
   - Agent/customer pages show "Session has ended"

#### Test 2.7.4: Admin Metrics
1. **Top of Dashboard Shows:**
   - "Active Sessions: X" (count of sessions with status='active')
   - "Active Participants: Y" (count of connected participants)
   - "Active Rooms: Z" (count of mediasoup routers)

2. **Verify Updates:**
   - Create new session → metrics update
   - Add second participant → count increases
   - End session → count decreases
   - Click "🔄 Refresh" to update metrics manually

---

## 3. API Testing (for developers)

### 3.1 Session Management APIs

#### Create Session
```bash
curl -X POST http://localhost:3002/api/session \
  -H "Content-Type: application/json" \
  -d '{"agentName":"John","customerName":"Customer"}'
```
**Expected:** `{"sessionId":"...", "token":"..."}`

#### Get Session by Token
```bash
curl http://localhost:3002/api/session/{token}
```
**Expected:** Session details (agentName, customerName, status, etc.)

#### Get All Sessions
```bash
curl http://localhost:3002/api/sessions
```
**Expected:** Array of all sessions

#### Get Session History
```bash
curl http://localhost:3002/api/session/{sessionId}/history
```
**Expected:** Complete history (participants, chat, files, recordings)

#### End Session
```bash
curl -X POST http://localhost:3002/api/session/{sessionId}/end
```
**Expected:** `{"success":true}`

### 3.2 File Upload APIs

#### Upload File
```bash
curl -X POST http://localhost:3002/api/session/{sessionId}/upload \
  -F "file=@/path/to/file.txt" \
  -F "sender=John" \
  -F "role=agent"
```
**Expected:** `{"url":"/uploads/...", "originalName":"...", "createdAt":"..."}`

### 3.3 Recording APIs

#### Upload Recording
```bash
curl -X POST http://localhost:3002/api/session/{sessionId}/recording \
  -F "recording=@/path/to/recording.webm"
```
**Expected:** `{"url":"/recordings/...", "originalName":"...", "createdAt":"..."}`

### 3.4 Metrics API

#### Get Operational Metrics
```bash
curl http://localhost:3002/api/metrics
```
**Expected:** `{"activeSessions":X, "activeParticipants":Y, "activeRooms":Z}`

---

## 4. Advanced Testing Scenarios

### 4.1 Multi-Party Sessions
1. Create a session with Agent A
2. Join with Customer 1
3. Open another browser window and join Agent B to same session
4. Verify all three participants see each other
5. Test chat/file sharing with 3 participants

### 4.2 Network Disruption
1. Agent and Customer in active call
2. Unplug network cable or disable WiFi for one participant
3. Verify 18-second grace window behavior
4. Reconnect and verify seamless rejoin
5. Test with longer disruption (>18 seconds) and verify cleanup

### 4.3 Rapid Session Creation
1. Create 5 sessions rapidly (click Create Session multiple times)
2. Verify all sessions appear in Admin Dashboard
3. Metrics show correct active session count
4. No data corruption or conflicts

### 4.4 Large File Upload
1. Create a session
2. Attempt to upload a large file (e.g., 50MB image/video)
3. Verify upload completes successfully
4. File appears in history with correct size
5. Download file and verify integrity

### 4.5 Long Recording Session
1. Start recording
2. Keep session active for 5+ minutes
3. Perform various actions (chat, files, video toggle)
4. Stop recording
5. Verify recording contains full duration
6. Check file size is reasonable (not 0 or corrupt)

---

## 5. Browser Compatibility Testing

Test on multiple browsers:
- ✅ **Chrome/Chromium** (primary)
- ✅ **Firefox** (secondary)
- ✅ **Edge** (secondary)
- ⚠️ **Safari** (limited WebRTC support)

**For Each Browser:**
1. Test session creation
2. Test video/audio capture
3. Test file upload
4. Test chat messaging
5. Note any warnings in browser console

---

## 6. Database Verification

### Check SQLite Database
```bash
# On Windows with sqlite3 installed:
sqlite3 data.db

# Useful queries:
SELECT * FROM sessions;
SELECT * FROM participants;
SELECT * FROM chat WHERE sessionId='<sessionId>';
SELECT * FROM files WHERE sessionId='<sessionId>';
SELECT * FROM recordings WHERE sessionId='<sessionId>';
```

### Verify Schema
All tables should exist:
- `sessions` (id, agentName, customerName, token, createdAt, endedAt, status)
- `participants` (id, sessionId, role, name, joinedAt, leftAt)
- `chat` (id, sessionId, sender, role, message, createdAt)
- `files` (id, sessionId, filename, originalName, sender, role, createdAt)
- `recordings` (id, sessionId, filename, originalName, createdAt)

---

## 7. Performance & Load Testing

### Single Session Performance
- ✅ Create session: <500ms
- ✅ Join session: <2 seconds
- ✅ Video startup: <3 seconds
- ✅ Send message: <100ms latency
- ✅ Upload file (1MB): <5 seconds

### Multiple Sessions
- ✅ Admin dashboard with 10+ sessions: <1 second load
- ✅ Metrics endpoint: <100ms response

---

## 8. Security Testing

### Test Scenarios
1. **Token Validation:**
   - Use invalid token → error message
   - Use expired token → error message
   - Token format validation works

2. **File Upload Security:**
   - Attempt to upload executable file → handled gracefully
   - Filename sanitization (no path traversal)

3. **XSS Prevention:**
   - Send chat message with `<script>` tag
   - Verify script is NOT executed (rendered as text)

4. **CORS Protection:**
   - API requests from different origins are handled correctly

---

## 9. Troubleshooting Guide

| Issue | Cause | Solution |
|-------|-------|----------|
| "Unable to access camera or microphone" | Permission denied | Check browser permissions, allow in settings |
| Video not showing | Camera in use by another app | Close other apps using camera |
| Server won't start | Port 3002 in use | `lsof -i :3002` and kill process, or change PORT |
| Session not created | Server down | Check server logs, restart with `npm start` |
| File upload fails | Storage directory missing | Check `/uploads` and `/recordings` exist |
| Database locked | Multiple server instances | Kill all node processes: `pkill node` |
| Metrics show 0 | No active connections | Create new session and join |

---

## 10. Final Verification Checklist

- [ ] Home page loads
- [ ] Session creation works
- [ ] Token copy functionality works
- [ ] Join session works with token
- [ ] Call page loads with video/audio
- [ ] Audio mute/unmute works
- [ ] Video stop/start works
- [ ] Chat messaging works bidirectionally
- [ ] File upload works
- [ ] File link is clickable
- [ ] Recording start/stop works
- [ ] Recording upload works
- [ ] Recording link is clickable
- [ ] Participant list updates correctly
- [ ] Token display visible to agent only
- [ ] End Session available to agent only
- [ ] Session disconnect/reconnect works
- [ ] Admin dashboard displays sessions
- [ ] Admin can view session history
- [ ] Admin can end sessions
- [ ] Metrics display correctly
- [ ] Database records all data
- [ ] API endpoints respond correctly
- [ ] No console errors
- [ ] No database corruption

---

## Notes

- **Recommended Testing Time:** 30-45 minutes for complete feature coverage
- **Devices Needed:** 2 (one for agent, one for customer)
- **Network:** Stable internet connection (5+ Mbps recommended for HD video)
- **Logs Location:** Browser console (F12) and terminal running server

**For Questions or Issues:** Check server logs and browser console for error messages.

