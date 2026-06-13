// Import mediasoup client for WebRTC media handling
import * as mediasoupClient from 'https://esm.sh/mediasoup-client@3.20.0';

// Initialize Socket.IO connection for signaling
const socket = io();

// Extract session token from URL parameters
const params = new URLSearchParams(window.location.search);
const token = params.get('token');

// Get token display elements
const tokenDisplay = document.getElementById('tokenDisplay');
const tokenValue = document.getElementById('tokenValue');
const copyTokenBtn = document.getElementById('copyTokenFromCall');

// DOM element references for UI management
const sessionStatus = document.getElementById('sessionStatus');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const toggleAudio = document.getElementById('toggleAudio');
const toggleVideo = document.getElementById('toggleVideo');
const leaveBtn = document.getElementById('leaveBtn');
const chatLog = document.getElementById('chatLog');
const chatMessage = document.getElementById('chatMessage');
const sendChatBtn = document.getElementById('sendChatBtn');
const participantListEl = document.getElementById('participantList');
const startRecordingBtn = document.getElementById('startRecordingBtn');
const stopRecordingBtn = document.getElementById('stopRecordingBtn');
const recordingStatus = document.getElementById('recordingStatus');
const recordingLink = document.getElementById('recordingLink');
const fileInput = document.getElementById('fileInput');
const uploadFileBtn = document.getElementById('uploadFileBtn');
const fileStatus = document.getElementById('fileStatus');
const endSessionBtn = document.getElementById('endSessionBtn');

// Session state: retrieve participant role and name from localStorage
const role = localStorage.getItem('lastRole') || 'customer';
const name = localStorage.getItem('lastName') || 'Participant';
let sessionId;

// MediaSoup and WebRTC state
let device; // MediaSoup device for codec and capability negotiation
let sendTransport; // Transport for sending local media
let recvTransport; // Transport for receiving remote media
let localStream; // Local media stream (audio + video)
let remoteStream = new MediaStream(); // Remote participant's media stream
let isAudioOn = true; // Track audio state
let isVideoOn = true; // Track video state
let mediaRecorder; // Browser recorder for session recording
let recordingChunks = []; // Buffer for recording data chunks

remoteVideo.srcObject = remoteStream;

function socketRequest(event, data) {
  return new Promise((resolve, reject) => {
    socket.emit(event, data, (response) => {
      if (!response) return reject(new Error('No response from server'));
      if (response.error) return reject(new Error(response.error));
      resolve(response);
    });
  });
}

function addChatEntry(content) {
  const entry = document.createElement('div');
  entry.className = 'chat-entry';
  entry.innerHTML = content;
  chatLog.appendChild(entry);
  chatLog.scrollTop = chatLog.scrollHeight;
}

async function initSession() {
  if (!token) {
    sessionStatus.textContent = 'Missing session token.';
    return;
  }

  const res = await fetch(`/api/session/${token}`);
  if (!res.ok) {
    sessionStatus.textContent = 'Unable to find session.';
    return;
  }

  const session = await res.json();
  sessionId = session.id;
  sessionStatus.textContent = `Session active: ${session.agentName} + ${session.customerName}`;
  
  // Display token for agent to share with customer
  if (role === 'agent') {
    tokenDisplay.style.display = 'block';
    tokenValue.textContent = token;
    endSessionBtn.style.display = 'inline-block';
    copyTokenBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(token).then(() => {
        const originalText = copyTokenBtn.textContent;
        copyTokenBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          copyTokenBtn.textContent = originalText;
        }, 2000);
      }).catch(() => {
        alert('Failed to copy token. Token: ' + token);
      });
    });
  }
  if (role !== 'agent') {
    startRecordingBtn.style.display = 'none';
    stopRecordingBtn.style.display = 'none';
  }

  if (role === 'agent') {
    endSessionBtn.addEventListener('click', async () => {
      if (!confirm('End this session for all participants?')) return;
      try {
        const response = await fetch(`/api/session/${sessionId}/end`, { method: 'POST' });
        if (!response.ok) throw new Error('Unable to end session');
        socket.emit('leave-session', { sessionId });
        window.location.href = '/';
      } catch (error) {
        alert(`❌ ${error.message}`);
      }
    });
  }

  socket.on('session-ended', () => {
    sessionStatus.textContent = 'This session has ended.';
    setTimeout(() => {
      window.location.href = '/';
    }, 3000);
  });

  await startLocalStream();
  await joinSocket(sessionId);
  await loadDevice(sessionId);
  await createSendTransport(sessionId);
  await createRecvTransport(sessionId);
  await produceLocalTracks();
  await getExistingProducers(sessionId);
}

async function joinSocket(id) {
  await socketRequest('join-session', { sessionId: id, role, name });
}

async function startLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localVideo.srcObject = localStream;
  } catch (error) {
    sessionStatus.textContent = 'Unable to access camera or microphone.';
    console.error(error);
  }
}

async function loadDevice(id) {
  const { routerRtpCapabilities } = await socketRequest('getRouterRtpCapabilities', { sessionId: id });
  device = new mediasoupClient.Device();
  await device.load({ routerRtpCapabilities });
}

async function createSendTransport(id) {
  const { params } = await socketRequest('createWebRtcTransport', { sessionId: id });
  sendTransport = device.createSendTransport(params);

  sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
    socketRequest('connectTransport', { transportId: sendTransport.id, dtlsParameters, sessionId: id })
      .then(callback)
      .catch(errback);
  });

  sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
    try {
      const { id: producerId } = await socketRequest('produce', {
        transportId: sendTransport.id,
        kind,
        rtpParameters,
        sessionId: id,
      });
      callback({ id: producerId });
    } catch (error) {
      errback(error);
    }
  });
}

async function createRecvTransport(id) {
  const { params } = await socketRequest('createWebRtcTransport', { sessionId: id });
  recvTransport = device.createRecvTransport(params);

  recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
    socketRequest('connectTransport', { transportId: recvTransport.id, dtlsParameters, sessionId: id })
      .then(callback)
      .catch(errback);
  });
}

async function produceLocalTracks() {
  if (!sendTransport || !localStream) return;

  const audioTrack = localStream.getAudioTracks()[0];
  const videoTrack = localStream.getVideoTracks()[0];

  if (audioTrack) {
    await sendTransport.produce({ track: audioTrack });
  }
  if (videoTrack) {
    await sendTransport.produce({ track: videoTrack });
  }
}

async function getExistingProducers(id) {
  const { producerList } = await socketRequest('getProducers', { sessionId: id });
  for (const producer of producerList) {
    await consumeProducer(producer.id);
  }
}

async function consumeProducer(producerId) {
  if (!recvTransport) return;
  const { id, kind, rtpParameters } = await socketRequest('consume', {
    producerId,
    transportId: recvTransport.id,
    rtpCapabilities: device.rtpCapabilities,
    sessionId,
  });

  const consumer = await recvTransport.consume({
    id,
    producerId,
    kind,
    rtpParameters,
  });

  remoteStream.addTrack(consumer.track);
  await socketRequest('resume', { consumerId: consumer.id });
}

socket.on('new-producer', async ({ producerId }) => {
  try {
    await consumeProducer(producerId);
  } catch (error) {
    console.error('Error consuming new producer:', error);
  }
});

socket.on('participant-list', (participants) => {
  participantListEl.textContent = `Participants: ${participants.map((p) => `${p.name} (${p.role})`).join(', ')}`;
});

socket.on('chat-message', ({ sender, role, message }) => {
  addChatEntry(`<strong>${sender} (${role}):</strong> ${message}`);
});

socket.on('file-shared', ({ sender, role, originalName, url, createdAt }) => {
  addChatEntry(`<strong>${sender} (${role}):</strong> <a href="${url}" target="_blank">${originalName}</a>`);
});

socket.on('recording-ready', ({ url, originalName }) => {
  recordingLink.innerHTML = `Recording ready: <a href="${url}" target="_blank">${originalName}</a>`;
  recordingStatus.textContent = '';
});

sendChatBtn.addEventListener('click', () => {
  const message = chatMessage.value.trim();
  if (!message) return;
  socket.emit('chat-message', {
    sessionId,
    sender: name,
    role,
    message,
  });
  chatMessage.value = '';
});

chatMessage.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    sendChatBtn.click();
  }
});

toggleAudio.addEventListener('click', () => {
  isAudioOn = !isAudioOn;
  localStream.getAudioTracks().forEach((track) => (track.enabled = isAudioOn));
  toggleAudio.textContent = isAudioOn ? 'Mute Audio' : 'Unmute Audio';
});

toggleVideo.addEventListener('click', () => {
  isVideoOn = !isVideoOn;
  localStream.getVideoTracks().forEach((track) => (track.enabled = isVideoOn));
  toggleVideo.textContent = isVideoOn ? 'Stop Video' : 'Start Video';
});

function buildRecordingStream() {
  const recordStream = new MediaStream();
  if (localStream) {
    localStream.getTracks().forEach((track) => recordStream.addTrack(track));
  }
  remoteStream.getTracks().forEach((track) => recordStream.addTrack(track));
  remoteStream.addEventListener('addtrack', (event) => {
    recordStream.addTrack(event.track);
  });
  return recordStream;
}

startRecordingBtn.addEventListener('click', () => {
  const recordStream = buildRecordingStream();
  try {
    mediaRecorder = new MediaRecorder(recordStream, { mimeType: 'video/webm; codecs=vp8,opus' });
  } catch (error) {
    recordingStatus.textContent = 'Recording is not supported in this browser.';
    return;
  }

  recordingChunks = [];
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) recordingChunks.push(event.data);
  };
  mediaRecorder.onstop = async () => {
    const blob = new Blob(recordingChunks, { type: 'video/webm' });
    const formData = new FormData();
    formData.append('recording', blob, `session-${sessionId}-recording.webm`);
    recordingStatus.textContent = 'Uploading recording...';
    try {
      const response = await fetch(`/api/session/${sessionId}/recording`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      recordingLink.innerHTML = `Recording ready: <a href="${data.url}" target="_blank">${data.originalName}</a>`;
      recordingStatus.textContent = 'Recording uploaded successfully.';
    } catch (error) {
      recordingStatus.textContent = `Recording upload failed: ${error.message}`;
      console.error(error);
    }
    stopRecordingBtn.disabled = true;
    startRecordingBtn.disabled = false;
  };

  mediaRecorder.start(1000);
  recordingStatus.textContent = 'Recording in progress...';
  startRecordingBtn.disabled = true;
  stopRecordingBtn.disabled = false;
});

stopRecordingBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
});

uploadFileBtn.addEventListener('click', async () => {
  if (!fileInput.files.length) {
    fileStatus.textContent = 'Choose a file to upload.';
    return;
  }
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sender', name);
  formData.append('role', role);

  fileStatus.textContent = 'Uploading file...';
  try {
    const response = await fetch(`/api/session/${sessionId}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Upload failed');
    const data = await response.json();
    fileStatus.textContent = `File shared: ${data.originalName}`;
    fileInput.value = '';
  } catch (error) {
    fileStatus.textContent = `File upload failed: ${error.message}`;
    console.error(error);
  }
});

leaveBtn.addEventListener('click', () => {
  socket.emit('leave-session', { sessionId });
  window.location.href = '/';
});

initSession().catch((error) => {
  console.error(error);
  sessionStatus.textContent = `Connection error: ${error.message}`;
});
