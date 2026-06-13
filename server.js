// ===== DEPENDENCIES =====
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const mediasoup = require('mediasoup');
const { v4: uuidv4 } = require('uuid');

// ===== SERVER INITIALIZATION =====
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ===== STORAGE CONFIGURATION =====
// Create directories for uploads and recordings
const uploadDir = path.join(__dirname, 'uploads');
const recordingsDir = path.join(__dirname, 'recordings');
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(recordingsDir, { recursive: true });

// ===== DATABASE SETUP =====
const db = new sqlite3.Database('data.db');
const PORT = process.env.PORT || 3000;

// ===== MEDIASOUP CONFIGURATION =====
// Worker manages the WebRTC routing and media processing
let worker;
const rooms = new Map(); // Store active rooms with their routers and transports

/**
 * Initialize MediaSoup worker for handling WebRTC streams
 * The worker processes all media routing and codec negotiation
 */
async function runMediasoupWorker() {
  worker = await mediasoup.createWorker({
    rtcMinPort: 20000,
    rtcMaxPort: 20200,
    logLevel: 'warn',
    logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
  });

  // Handle worker crashes gracefully
  worker.on('died', () => {
    console.error('❌ MediaSoup worker crashed. Restarting in 2 seconds...');
    setTimeout(() => process.exit(1), 2000);
  });
}

/**
 * Initialize SQLite database schema
 * Creates tables for sessions, participants, chat, files, and recordings
 */
function initDatabase() {
  db.serialize(() => {
    // Sessions table: stores session metadata
    db.run(`CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      agentName TEXT,
      customerName TEXT,
      token TEXT,
      createdAt TEXT,
      endedAt TEXT,
      status TEXT
    )`);

    // Participants table: tracks join/leave events
    db.run(`CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT,
      role TEXT,
      name TEXT,
      joinedAt TEXT,
      leftAt TEXT
    )`);

    // Chat table: persists in-call messages
    db.run(`CREATE TABLE IF NOT EXISTS chat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT,
      sender TEXT,
      role TEXT,
      message TEXT,
      createdAt TEXT
    )`);

    // Files table: tracks uploaded files during sessions
    db.run(`CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT,
      filename TEXT,
      originalName TEXT,
      sender TEXT,
      role TEXT,
      createdAt TEXT
    )`);

    // Recordings table: stores session recordings
    db.run(`CREATE TABLE IF NOT EXISTS recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT,
      filename TEXT,
      originalName TEXT,
      createdAt TEXT
    )`);
  });
}

// ===== EXPRESS MIDDLEWARE =====
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));
app.use('/recordings', express.static(recordingsDir));
app.use(express.json());

// ===== FILE UPLOAD CONFIGURATION =====
// Configure storage for files shared during sessions
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});
const upload = multer({ storage });

// Configure storage for session recordings
const recordingStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, recordingsDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});
const recordingUpload = multer({ storage: recordingStorage });

// ===== API ENDPOINTS =====

/**
 * GET /api/session/:id/history
 * Retrieves complete session history including participants, chat, files, and recordings
 */
app.get('/api/session/:id/history', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM sessions WHERE id = ?', [id], (err, session) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    db.all('SELECT role, name, joinedAt, leftAt FROM participants WHERE sessionId = ? ORDER BY joinedAt ASC', [id], (err2, participants) => {
      if (err2) return res.status(500).json({ error: err2.message });

      db.all('SELECT sender, role, message, createdAt FROM chat WHERE sessionId = ? ORDER BY createdAt ASC', [id], (err3, chat) => {
        if (err3) return res.status(500).json({ error: err3.message });

        db.all('SELECT originalName, filename, sender, role, createdAt FROM files WHERE sessionId = ? ORDER BY createdAt ASC', [id], (err4, files) => {
          if (err4) return res.status(500).json({ error: err4.message });

          db.all('SELECT originalName, filename, createdAt FROM recordings WHERE sessionId = ? ORDER BY createdAt ASC', [id], (err5, recordings) => {
            if (err5) return res.status(500).json({ error: err5.message });
            res.json({ session, participants, chat, files, recordings });
          });
        });
      });
    });
  });
});

/**
 * GET /api/sessions
 * Retrieves all sessions sorted by creation date (newest first)
 */
app.get('/api/sessions', (req, res) => {
  db.all('SELECT * FROM sessions ORDER BY createdAt DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

/**
 * GET /api/metrics
 * Returns simple operational metrics for the admin dashboard and observability.
 */
app.get('/api/metrics', (req, res) => {
  try {
    const activeSessions = rooms.size;
    const activeParticipants = Array.from(rooms.values()).reduce((sum, room) => sum + room.participants.size, 0);
    const activeRooms = rooms.size;
    res.json({ activeSessions, activeParticipants, activeRooms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/session/:token
 * Looks up a session by its unique token (used by customers joining)
 */
app.get('/api/session/:token', (req, res) => {
  const { token } = req.params;
  db.get('SELECT * FROM sessions WHERE token = ?', [token], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Session not found' });
    res.json(row);
  });
});

/**
 * POST /api/session
 * Creates a new support session with unique ID and token
 */
app.post('/api/session', (req, res) => {
  const { agentName, customerName } = req.body;
  const sessionId = uuidv4();
  const token = uuidv4();
  const createdAt = new Date().toISOString();

  db.run(
    `INSERT INTO sessions (id, agentName, customerName, token, createdAt, status) VALUES (?, ?, ?, ?, ?, ?)`,
    [sessionId, agentName, customerName, token, createdAt, 'active'],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ sessionId, token });
    }
  );
});

/**
 * POST /api/session/:id/end
 * Marks a session as ended with completion timestamp
 */
app.post('/api/session/:id/end', (req, res) => {
  const { id } = req.params;
  const endedAt = new Date().toISOString();
  db.run(
    `UPDATE sessions SET endedAt = ?, status = ? WHERE id = ?`,
    [endedAt, 'ended', id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Session not found' });
      io.to(id).emit('session-ended');
      res.json({ success: true });
    }
  );
});

/**
 * POST /api/session/:id/upload
 * Handles file uploads during active sessions
 * Stores file in database and notifies participants
 */
app.post('/api/session/:id/upload', upload.single('file'), (req, res) => {
  const { id } = req.params;
  const { sender, role } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  const createdAt = new Date().toISOString();
  const url = `/uploads/${req.file.filename}`;

  db.run(
    `INSERT INTO files (sessionId, filename, originalName, sender, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, req.file.filename, req.file.originalname, sender, role, createdAt],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      // Broadcast file share event to all participants
      io.to(id).emit('file-shared', {
        sender,
        role,
        originalName: req.file.originalname,
        url,
        createdAt,
      });
      res.json({ url, originalName: req.file.originalname, createdAt });
    }
  );
});

/**
 * POST /api/session/:id/recording
 * Handles recording uploads from browser MediaRecorder
 */
app.post('/api/session/:id/recording', recordingUpload.single('recording'), (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No recording uploaded' });
  
  const createdAt = new Date().toISOString();
  const url = `/recordings/${req.file.filename}`;

  db.run(
    `INSERT INTO recordings (sessionId, filename, originalName, createdAt) VALUES (?, ?, ?, ?)`,
    [id, req.file.filename, req.file.originalname, createdAt],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      // Notify all participants that recording is ready
      io.to(id).emit('recording-ready', { url, originalName: req.file.originalname, createdAt });
      res.json({ url, originalName: req.file.originalname, createdAt });
    }
  );
});

// ===== MEDIASOUP HELPER FUNCTIONS =====

/**
 * Create a new MediaSoup room for a session
 * A room contains a router that manages all media streams for that session
 */
async function createRoom(sessionId) {
  const router = await worker.createRouter({ 
    mediaCodecs: [
      // Audio codec: Opus (industry standard for voice)
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      // Video codec: VP8 (WebRTC standard, good compression)
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
      },
    ]
  });
  
  rooms.set(sessionId, {
    router,
    transports: new Map(),
    producers: new Map(),
    consumers: new Map(),
    participants: new Map(),
    pendingLeaves: new Map(),
  });
  return rooms.get(sessionId);
}

/**
 * Clean up socket resources when a participant disconnects
 * Closes all transports, producers, and consumers associated with the socket
 */
function cleanupSocketResources(room, socketId) {
  // Close all sending/receiving transports for this socket
  for (const [transportId, transportData] of room.transports.entries()) {
    if (transportData.socketId === socketId) {
      transportData.transport.close();
      room.transports.delete(transportId);
    }
  }
  // Stop all media producers (audio/video tracks)
  for (const [producerId, producerData] of room.producers.entries()) {
    if (producerData.socketId === socketId) {
      producerData.producer.close();
      room.producers.delete(producerId);
    }
  }
  // Stop all media consumers
  for (const [consumerId, consumerData] of room.consumers.entries()) {
    if (consumerData.socketId === socketId) {
      consumerData.consumer.close();
      room.consumers.delete(consumerId);
    }
  }
}

/**
 * Create WebRTC transport for bidirectional media flow
 * Both send (browser → server) and recv (server → browser) transports are created
 */
async function createWebRtcTransport(router) {
  const transport = await router.createWebRtcTransport({
    listenIps: [{ ip: '0.0.0.0', announcedIp: null }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1000000, // 1 Mbps initial bitrate
  });
  return transport;
}

// ===== SOCKET.IO REAL-TIME SIGNALING =====

/**
 * Socket.IO connection handler
 * Manages WebRTC signaling, media negotiation, and session management
 */
io.on('connection', (socket) => {
  console.log(`✓ Socket connected: ${socket.id}`);

  /**
   * join-session: Participant joins a support session
   * Initializes MediaSoup room, tracks participant, logs join time
   */
  socket.on('join-session', async ({ sessionId, role, name }, callback) => {
    try {
      socket.join(sessionId);
      const room = rooms.get(sessionId) || await createRoom(sessionId);
      const reconnectKey = `${role}:${name}`;

      if (room.pendingLeaves?.has(reconnectKey)) {
        const pending = room.pendingLeaves.get(reconnectKey);
        clearTimeout(pending.timer);
        cleanupSocketResources(room, pending.socketId);
        room.participants.delete(pending.socketId);
        room.pendingLeaves.delete(reconnectKey);
      }

      room.participants.set(socket.id, { role, name });

      const joinedAt = new Date().toISOString();
      db.run(
        `INSERT INTO participants (sessionId, role, name, joinedAt) VALUES (?, ?, ?, ?)`,
        [sessionId, role, name, joinedAt]
      );

      io.to(sessionId).emit('participant-list', Array.from(room.participants.values()));
      if (callback) callback({ success: true });
    } catch (error) {
      console.error('join-session error', error);
      if (callback) callback({ error: error.message });
    }
  });

  socket.on('getRouterRtpCapabilities', ({ sessionId }, callback) => {
    // Client needs router's RTP capabilities to determine what codecs/formats it can use
    try {
      const room = rooms.get(sessionId);
      if (!room) return callback({ error: 'Room not found' });
      callback({ routerRtpCapabilities: room.router.rtpCapabilities });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  /**
   * createWebRtcTransport: Create bidirectional media transport
   * Client calls this twice: once for sending, once for receiving
   */
  socket.on('createWebRtcTransport', async ({ sessionId }, callback) => {
    try {
      const room = rooms.get(sessionId);
      if (!room) return callback({ error: 'Room not found' });
      
      // Create transport with ICE candidates and DTLS parameters
      const transport = await createWebRtcTransport(room.router);
      room.transports.set(transport.id, { transport, socketId: socket.id });

      callback({
        params: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        },
      });
    } catch (error) {
      console.error('createWebRtcTransport error', error);
      callback({ error: error.message });
    }
  });

  /**
   * connectTransport: Establish DTLS connection for transport
   * This completes the connection handshake between client and server
   */
  socket.on('connectTransport', async ({ transportId, dtlsParameters, sessionId }, callback) => {
    try {
      const room = rooms.get(sessionId);
      const transportData = room?.transports.get(transportId);
      if (!transportData) return callback({ error: 'Transport not found' });
      
      // Complete the DTLS handshake
      await transportData.transport.connect({ dtlsParameters });
      callback({ connected: true });
    } catch (error) {
      console.error('connectTransport error', error);
      callback({ error: error.message });
    }
  });

  /**
   * produce: Client sends audio/video track to server
   * Creates a producer on the server that other clients can consume
   */
  socket.on('produce', async ({ transportId, kind, rtpParameters, sessionId }, callback) => {
    try {
      const room = rooms.get(sessionId);
      const transportData = room?.transports.get(transportId);
      if (!transportData) return callback({ error: 'Transport not found' });

      // Start receiving media from client
      const producer = await transportData.transport.produce({ kind, rtpParameters });
      room.producers.set(producer.id, { producer, socketId: socket.id, kind });
      
      // Clean up producer if transport closes unexpectedly
      producer.on('transportclose', () => {
        room.producers.delete(producer.id);
      });

      // Notify other participant about new media stream
      socket.to(sessionId).emit('new-producer', { producerId: producer.id });
      callback({ id: producer.id });
    } catch (error) {
      console.error('produce error', error);
      callback({ error: error.message });
    }
  });

  /**
   * getProducers: Get list of active producers (excluding own)
   * Client uses this to discover media streams from other participants
   */
  socket.on('getProducers', ({ sessionId }, callback) => {
    try {
      const room = rooms.get(sessionId);
      if (!room) return callback({ error: 'Room not found' });
      
      // Filter out own producers to avoid echo
      const producerList = Array.from(room.producers.entries())
        .filter(([, data]) => data.socketId !== socket.id)
        .map(([id, data]) => ({ id, kind: data.kind }));
      callback({ producerList });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  /**
   * consume: Client receives audio/video track from server
   * Creates a consumer that receives media from a producer
   */
  socket.on('consume', async ({ producerId, transportId, rtpCapabilities, sessionId }, callback) => {
    try {
      const room = rooms.get(sessionId);
      const producerData = room?.producers.get(producerId);
      if (!producerData) return callback({ error: 'Producer not found' });

      // Check if server can route this producer to this client
      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        return callback({ error: 'Cannot consume' });
      }

      const transportData = room.transports.get(transportId);
      if (!transportData) return callback({ error: 'Transport not found' });

      // Create consumer to receive the media
      const consumer = await transportData.transport.consume({
        producerId,
        rtpCapabilities,
        paused: false,
      });
      room.consumers.set(consumer.id, { consumer, socketId: socket.id });

      // Clean up consumer if transport closes
      consumer.on('transportclose', () => {
        room.consumers.delete(consumer.id);
      });

      callback({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    } catch (error) {
      console.error('consume error', error);
      callback({ error: error.message });
    }
  });

  /**
   * resume: Resume paused consumer
   * Consumer starts receiving media after being paused
   */
  socket.on('resume', async ({ consumerId }, callback) => {
    try {
      // Find consumer in any room (client may not know room ID)
      for (const room of rooms.values()) {
        const consumerData = room.consumers.get(consumerId);
        if (consumerData) {
          await consumerData.consumer.resume();
          return callback({ resumed: true });
        }
      }
      callback({ error: 'Consumer not found' });
    } catch (error) {
      console.error('resume error', error);
      callback({ error: error.message });
    }
  });

  /**
   * leave-session: Participant manually leaves the session
   * Removes socket from room broadcast group
   */
  socket.on('leave-session', ({ sessionId }) => {
    socket.leave(sessionId);
  });

  /**
   * disconnect: Handle unexpected or intentional disconnect
   * Allows 18 seconds for participant to reconnect before cleanup
   * This prevents data loss if participant has temporary network issue
   */
  socket.on('disconnect', () => {
    for (const [sessionId, room] of rooms.entries()) {
      if (room.participants.has(socket.id)) {
        const participant = room.participants.get(socket.id);
        const reconnectKey = `${participant.role}:${participant.name}`;

        if (!room.pendingLeaves) {
          room.pendingLeaves = new Map();
        }

        // Wait 18 seconds for participant to reconnect
        const timer = setTimeout(() => {
          const leftAt = new Date().toISOString();
          // Mark participant as left in database
          db.run(
            `UPDATE participants SET leftAt = ? WHERE sessionId = ? AND name = ? AND role = ? AND leftAt IS NULL`,
            [leftAt, sessionId, participant.name, participant.role]
          );
          // Clean up all socket resources (transports, producers, consumers)
          cleanupSocketResources(room, socket.id);
          room.participants.delete(socket.id);
          room.pendingLeaves.delete(reconnectKey);
          // Notify other participants of the departure
          io.to(sessionId).emit('participant-list', Array.from(room.participants.values()));
        }, 18000);

        room.pendingLeaves.set(reconnectKey, { socketId: socket.id, timer });
      }
    }
  });

  /**
   * chat-message: Broadcast text message to session
   * Persists message to database for history and audit trail
   */
  socket.on('chat-message', ({ sessionId, sender, role, message }) => {
    const createdAt = new Date().toISOString();
    // Store message in database
    db.run(
      `INSERT INTO chat (sessionId, sender, role, message, createdAt) VALUES (?, ?, ?, ?, ?)`,
      [sessionId, sender, role, message, createdAt]
    );
    // Broadcast to all session participants
    io.to(sessionId).emit('chat-message', { sender, role, message, createdAt });
  });
});

// ===== SERVER STARTUP =====

/**
 * Start listening on specified port
 * Attempts to bind to port, with automatic fallback to next port if in use
 * Useful for development where port reuse is needed
 */
async function startListening(startPort, maxRetries = 5) {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const port = startPort + attempt;
    try {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, () => {
          server.removeListener('error', reject);
          resolve();
        });
      });
      return port;
    } catch (error) {
      if (error.code !== 'EADDRINUSE' || attempt === maxRetries) {
        throw error;
      }
      console.warn(`⚠ Port ${port} is in use, trying ${port + 1}...`);
    }
  }
}

/**
 * Initialize and start the server
 * Sets up database, starts MediaSoup worker, and begins listening
 */
(async () => {
  try {
    // Initialize SQLite database tables
    initDatabase();
    
    // Start MediaSoup worker for WebRTC media routing
    await runMediasoupWorker();
    console.log('✓ MediaSoup worker started');
    
    // Start HTTP/Socket.IO server
    const port = await startListening(Number(process.env.PORT) || 3000, 10);
    console.log(`✓ Server listening on http://localhost:${port}`);
    console.log(`✓ Open browser to http://localhost:${port}`);
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
})();
