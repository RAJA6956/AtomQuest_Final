// DOM element references for admin dashboard
const sessionsContainer = document.getElementById('sessionsContainer');
const historyCard = document.getElementById('historyCard');
const historyContent = document.getElementById('historyContent');
const refreshBtn = document.getElementById('refreshBtn');
const metricsContainer = document.getElementById('metricsContainer');

/**
 * Fetch and display all sessions
 * Shows active and completed sessions with action buttons
 */
async function fetchMetrics() {
  try {
    const res = await fetch('/api/metrics');
    if (!res.ok) throw new Error(`Metrics error: ${res.status}`);
    const data = await res.json();
    metricsContainer.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
        <div style="background: rgba(54, 196, 255, 0.08); padding: 16px; border-radius: 10px;">
          <strong style="display:block; font-size: 1.4rem; color: #36c4ff;">${data.activeSessions}</strong>
          Active sessions
        </div>
        <div style="background: rgba(54, 196, 255, 0.08); padding: 16px; border-radius: 10px;">
          <strong style="display:block; font-size: 1.4rem; color: #36c4ff;">${data.activeParticipants}</strong>
          Connected participants
        </div>
        <div style="background: rgba(54, 196, 255, 0.08); padding: 16px; border-radius: 10px;">
          <strong style="display:block; font-size: 1.4rem; color: #36c4ff;">${data.activeRooms}</strong>
          Active rooms
        </div>
      </div>
    `;
  } catch (error) {
    metricsContainer.innerHTML = `<span style="color: #ff6b6b;">Failed to load metrics</span>`;
    console.error('Failed to fetch metrics:', error);
  }
}

async function fetchSessions() {
  try {
    const res = await fetch('/api/sessions');
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    
    const sessions = await res.json();
    sessionsContainer.innerHTML = '';

    if (!sessions.length) {
      sessionsContainer.innerHTML = '<p>No sessions found. Sessions will appear here once created.</p>';
      return;
    }

    // Create sessions table
    const table = document.createElement('table');
    table.className = 'admin-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Session ID</th>
          <th>Agent</th>
          <th>Customer</th>
          <th>Status</th>
          <th>Started</th>
          <th>Ended</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    sessions.forEach((session) => {
      const row = document.createElement('tr');
      const startTime = new Date(session.createdAt).toLocaleString();
      const endTime = session.endedAt ? new Date(session.endedAt).toLocaleString() : '-';
      
      row.innerHTML = `
        <td style="font-size: 0.85rem; font-family: monospace;">${session.id.substring(0, 8)}...</td>
        <td>${session.agentName}</td>
        <td>${session.customerName}</td>
        <td><strong style="color: ${session.status === 'active' ? '#36c4ff' : '#7fbfff'}">${session.status.toUpperCase()}</strong></td>
        <td>${startTime}</td>
        <td>${endTime}</td>
        <td>
          <button class="action-btn" data-id="${session.id}" data-action="history">View</button>
          ${session.status === 'active' ? `<button class="action-btn" data-id="${session.id}" data-action="end" style="color: #ff6b6b;">End</button>` : ''}
        </td>
      `;
      tbody.appendChild(row);
    });

    sessionsContainer.appendChild(table);
    
    // Attach event listeners to action buttons
    sessionsContainer.querySelectorAll('.action-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.id));
    });
  } catch (error) {
    sessionsContainer.innerHTML = `<p style="color: #ff6b6b;">❌ Error loading sessions: ${error.message}</p>`;
    console.error('Failed to fetch sessions:', error);
  }
}

/**
 * Handle action buttons (View history, End session)
 * @param {string} action - Type of action to perform
 * @param {string} id - Session ID
 */
async function handleAction(action, id) {
  if (action === 'end') {
    if (!confirm('Are you sure you want to end this session?')) return;
    
    try {
      const res = await fetch(`/api/session/${id}/end`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to end session');
      
      alert('✓ Session ended successfully');
      await fetchSessions();
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
      console.error('Failed to end session:', error);
    }
    return;
  }
  
  if (action === 'history') {
    try {
      const res = await fetch(`/api/session/${id}/history`);
      if (!res.ok) throw new Error('Failed to load session history');
      
      const data = await res.json();
      renderHistory(data);
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
      console.error('Failed to fetch session history:', error);
    }
  }
}

/**
 * Render detailed session history view
 * Shows participants, chat, files, and recordings for a session
 */
function renderHistory({ session, participants, chat, files, recordings }) {
  historyCard.style.display = 'block';
  
  const duration = session.endedAt 
    ? new Date(new Date(session.endedAt) - new Date(session.createdAt)).toISOString().substring(11, 8)
    : 'Ongoing';
  
  historyContent.innerHTML = `
    <h3>${session.agentName} + ${session.customerName}</h3>
    <div class="info">
      <strong>Session ID:</strong> <span style="font-family: monospace;">${session.id}</span><br>
      <strong>Status:</strong> ${session.status.toUpperCase()}<br>
      <strong>Started:</strong> ${new Date(session.createdAt).toLocaleString()}<br>
      <strong>Ended:</strong> ${session.endedAt ? new Date(session.endedAt).toLocaleString() : 'Ongoing'}<br>
      <strong>Duration:</strong> ${duration}
    </div>
    
    <h4>Participants (${participants.length})</h4>
    <ul style="list-style: none; padding: 0;">
      ${participants.map((p) => `
        <li style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <strong>${p.name}</strong> <em style="color: #7fbfff;">(${p.role})</em><br>
          <small>Joined: ${new Date(p.joinedAt).toLocaleString()}${p.leftAt ? '<br>Left: ' + new Date(p.leftAt).toLocaleString() : ''}</small>
        </li>
      `).join('')}
    </ul>
    
    <h4>Chat Messages (${chat.length})</h4>
    ${chat.length > 0 ? `
      <div style="background: rgba(255,255,255,0.04); border-radius: 10px; padding: 10px; max-height: 250px; overflow-y: auto;">
        ${chat.map((msg) => `
          <div style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <strong>${msg.sender}</strong> <em style="color: #7fbfff; font-size: 0.85rem;">(${msg.role})</em><br>
            <span>${msg.message}</span><br>
            <small style="color: #7fbfff;">${new Date(msg.createdAt).toLocaleString()}</small>
          </div>
        `).join('')}
      </div>
    ` : '<p>No messages</p>'}
    
    <h4>Files Shared (${files.length})</h4>
    ${files.length > 0 ? `
      <ul style="list-style: none; padding: 0;">
        ${files.map((f) => `
          <li style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <strong>${f.sender}</strong> <em style="color: #7fbfff;">(${f.role})</em>:<br>
            <a href="/uploads/${f.filename}" target="_blank" style="color: #36c4ff;">📥 ${f.originalName}</a>
          </li>
        `).join('')}
      </ul>
    ` : '<p>No files shared</p>'}
    
    <h4>Recordings (${recordings.length})</h4>
    ${recordings.length > 0 ? `
      <ul style="list-style: none; padding: 0;">
        ${recordings.map((rec) => `
          <li style="padding: 6px 0;">
            <a href="/recordings/${rec.filename}" target="_blank" style="color: #36c4ff;">🎥 ${rec.originalName}</a>
          </li>
        `).join('')}
      </ul>
    ` : '<p>No recordings</p>'}
  `;
  
  // Scroll to history section
  historyCard.scrollIntoView({ behavior: 'smooth' });
}

// Event listeners
refreshBtn.addEventListener('click', async () => {
  await Promise.all([fetchMetrics(), fetchSessions()]);
});

/**
 * Initialize dashboard on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await Promise.all([fetchMetrics(), fetchSessions()]);
  } catch (error) {
    sessionsContainer.innerHTML = `<p style="color: #ff6b6b;">❌ Failed to load dashboard: ${error.message}</p>`;
    console.error('Dashboard initialization error:', error);
  }
});