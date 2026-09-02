const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { io } = require('socket.io-client');

const API_URL = 'http://127.0.0.1:5000/api';
const WS_URL = 'http://127.0.0.1:5000';

async function runRealtimeNotificationTest() {
  console.log('================================================================================');
  console.log('⚡ TESTING SOCIALDESK PROMPT 18 — REAL-TIME SOCKET.IO NOTIFICATIONS');
  console.log('================================================================================');

  try {
    // 1. Authenticate Manager User
    console.log('\n[1/3] Authenticating Workspace Manager...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sarah@socialdesk.com', password: 'password123' }),
    });
    const loginData = await loginRes.json();
    const token = loginData.data.token;
    const userId = loginData.data.user.id;
    console.log(`✅ Authenticated! User ID: ${userId} (${loginData.data.user.email})`);

    // 2. Connect Socket.IO Client with Auth Token
    console.log('\n[2/3] Connecting authenticated Socket.IO Client...');
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    const notificationPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket.IO notification event timeout (10s).'));
      }, 10000);

      socket.on('connect', () => {
        console.log(`✅ Socket Connected Successfully! Socket ID: ${socket.id}`);
      });

      socket.on('notification', (data) => {
        clearTimeout(timeout);
        console.log('\n⚡ Real-time Notification Event Received via Socket.IO:');
        console.log(data);
        resolve(data);
      });

      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // Wait 1 second for socket connection to stabilize
    await new Promise((r) => setTimeout(r, 1000));

    // 3. Trigger Notification via API Action (Task Creation API call to server)
    console.log('\n[3/3] Triggering Persistent & Real-Time Notification via Task API...');
    const taskRes = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: `Real-time Strategy Task ${Date.now()}`,
        description: 'Testing Socket.IO real-time event dispatching',
        clientId: 1,
        assignedTo: userId,
        priority: 'HIGH',
      }),
    });
    const taskData = await taskRes.json();
    console.log(`✅ Task Created via API (ID: ${taskData.data.id}). Awaiting Socket.IO event...`);

    const receivedNotif = await notificationPromise;
    console.log('\n   ✅ Real-time event delivery successfully verified!');

    socket.disconnect();

    console.log('\n================================================================================');
    console.log('🎉 PROMPT 18 — REAL-TIME SOCKET.IO NOTIFICATIONS VERIFIED 100% SUCCESSFULLY!');
    console.log('================================================================================');
  } catch (error) {
    console.error('❌ Real-time Socket.IO Test Error:', error.message);
  }
}

runRealtimeNotificationTest();
