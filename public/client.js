// Initialize Socket.IO for real-time signaling
const socket = io();

// DOM element references for session creation flow
const agentName = document.getElementById('agentName');
const customerName = document.getElementById('customerName');
const createSessionBtn = document.getElementById('createSessionBtn');
const inviteLink = document.getElementById('inviteLink');
const joinName = document.getElementById('joinName');
const joinToken = document.getElementById('joinToken');
const joinSessionBtn = document.getElementById('joinSessionBtn');

/**
 * Handle agent session creation
 * Creates a new support session with unique token for customer invite
 */
createSessionBtn.addEventListener('click', async () => {
  const agent = agentName.value.trim();
  const customer = customerName.value.trim();
  
  // Validate input
  if (!agent || !customer) {
    inviteLink.textContent = '❌ Please enter both agent and customer names.';
    inviteLink.style.color = '#ff6b6b';
    return;
  }

  try {
    // Create session on backend
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentName: agent, customerName: customer }),
    });

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    const { sessionId, token } = await res.json();
    
    // Store session info for later reference
    localStorage.setItem('lastSessionId', sessionId);
    localStorage.setItem('lastRole', 'agent');
    localStorage.setItem('lastName', agent);
    
    // Display invitation link with token and copy button
    inviteLink.innerHTML = `
      <div style="background: rgba(54, 196, 255, 0.1); padding: 16px; border-radius: 8px; border: 1px solid rgba(54, 196, 255, 0.3);">
        <p style="margin: 0 0 12px 0; color: #7fbfff;">✓ Session created successfully!</p>
        <p style="margin: 0 0 8px 0; color: #c6d3ff; font-size: 0.9rem;"><strong>Share this token with the customer:</strong></p>
        <div style="display: flex; align-items: center; gap: 8px;">
          <code style="background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 4px; font-family: 'Courier New', monospace; color: #36c4ff; flex: 1; word-break: break-all;">${token}</code>
          <button id="copyTokenBtn" style="padding: 8px 16px; background: #36c4ff; border: none; border-radius: 4px; cursor: pointer; color: #001a33; font-weight: bold; white-space: nowrap;">📋 Copy</button>
        </div>
        <button id="goToCallBtn" style="width: 100%; margin-top: 12px; padding: 10px; background: #36c4ff; border: none; border-radius: 4px; cursor: pointer; color: #001a33; font-weight: bold; font-size: 1rem;">🚀 Go to Call (Share token first!)</button>
      </div>
    `;
    inviteLink.style.color = '#7fbfff';
    inviteLink.style.display = 'block';
    
    // Add copy button functionality
    document.getElementById('copyTokenBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(token).then(() => {
        const btn = document.getElementById('copyTokenBtn');
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
          btn.textContent = '📋 Copy';
        }, 2000);
      }).catch(() => {
        alert('Failed to copy token. Please copy manually: ' + token);
      });
    });
    
    // Add go to call button
    document.getElementById('goToCallBtn').addEventListener('click', () => {
      window.location.href = `/call.html?token=${encodeURIComponent(token)}`;
    });
  } catch (error) {
    inviteLink.textContent = `❌ Error: ${error.message}. Please try again.`;
    inviteLink.style.color = '#ff6b6b';
    console.error('Session creation error:', error);
  }
});

/**
 * Handle customer session join
 * Validates token and connects customer to existing support session
 */
joinSessionBtn.addEventListener('click', async () => {
  const name = joinName.value.trim();
  const token = joinToken.value.trim();
  
  // Validate input
  if (!name || !token) {
    alert('❌ Please enter your name and the session token provided by the support agent.');
    return;
  }

  try {
    // Verify token and fetch session details
    const res = await fetch(`/api/session/${token}`);
    if (!res.ok) {
      throw new Error('Invalid or expired session token');
    }

    const session = await res.json();
    
    // Store session info
    localStorage.setItem('lastSessionId', session.id);
    localStorage.setItem('lastRole', 'customer');
    localStorage.setItem('lastName', name);
    
    // Redirect to call screen
    window.location.href = `/call.html?token=${encodeURIComponent(token)}`;
  } catch (error) {
    alert(`❌ ${error.message}. Please check the token and try again.`);
    console.error('Session join error:', error);
  }
});

/**
 * Socket.IO connection event handler
 * Confirms signaling server connectivity
 */
socket.on('connect', () => {
  console.log('✓ Connected to signaling server');
});

socket.on('disconnect', () => {
  console.warn('⚠ Disconnected from signaling server');
});
