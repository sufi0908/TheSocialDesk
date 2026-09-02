const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Initialize Socket.IO Server with JWT authentication and room management.
 */
function initSocket(httpServer) {
  const isProduction = process.env.NODE_ENV === 'production';
  const rawClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const allowedOrigins = rawClientUrl
    ? rawClientUrl.split(',').map((url) => url.trim().replace(/\/+$/, ''))
    : [];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const normalizedOrigin = origin.replace(/\/+$/, '');

        if (!isProduction) {
          if (
            normalizedOrigin.includes('localhost') ||
            normalizedOrigin.includes('127.0.0.1') ||
            normalizedOrigin.includes('ngrok') ||
            allowedOrigins.includes(normalizedOrigin)
          ) {
            return callback(null, true);
          }
          return callback(null, true);
        }

        if (allowedOrigins.includes(normalizedOrigin)) {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // JWT Authentication Middleware for Socket.IO
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
      socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication error: Missing token.'));
    }

    try {
      const secret = process.env.JWT_SECRET || 'development-only-socialdesk-jwt-secret';
      const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
      socket.user = decoded;
      return next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token.'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    const userId = user.id || user.userId;
    const workspaceId = user.workspaceId || user.workspace_id;

    // CRITICAL: Join user's private channel and workspace channel
    if (userId) {
      socket.join(`user_${userId}`);
    }
    if (workspaceId) {
      socket.join(`workspace_${workspaceId}`);
    }
    if (user.clientId || user.client_id) {
      socket.join(`client_${user.clientId || user.client_id}`);
    }

    // Track active online users per socket
    if (workspaceId && userId) {
      io.to(`workspace_${workspaceId}`).emit('user_presence', {
        userId,
        status: 'ONLINE',
      });
    }

    // Join specific chat group room (with membership authorization)
    socket.on('join_group', async ({ groupId }) => {
      if (!groupId || !userId) return;
      try {
        const { db } = require('./database');
        const [members] = await db.execute(
          `SELECT cgm.id FROM chat_group_members cgm
           JOIN chat_groups cg ON cgm.group_id = cg.id
           WHERE cgm.group_id = ? AND cgm.user_id = ? AND cgm.left_at IS NULL AND cg.archived_at IS NULL`,
          [groupId, userId]
        );
        if (members && members.length > 0) {
          socket.join(`chat_group_${groupId}`);
        }
      } catch (err) {
        console.warn('Socket join_group error:', err.message);
      }
    });

    // Leave specific chat group room
    socket.on('leave_group', ({ groupId }) => {
      if (groupId) {
        socket.leave(`chat_group_${groupId}`);
      }
    });

    // Typing start indicator
    socket.on('typing_start', ({ groupId }) => {
      if (groupId && userId) {
        socket.to(`chat_group_${groupId}`).emit('user_typing', {
          groupId: Number(groupId),
          userId: Number(userId),
          userName: user.name || user.full_name || 'User',
        });
      }
    });

    // Typing stop indicator
    socket.on('typing_stop', ({ groupId }) => {
      if (groupId && userId) {
        socket.to(`chat_group_${groupId}`).emit('user_stop_typing', {
          groupId: Number(groupId),
          userId: Number(userId),
        });
      }
    });

    socket.on('disconnect', () => {
      if (workspaceId && userId) {
        io.to(`workspace_${workspaceId}`).emit('user_presence', {
          userId,
          status: 'OFFLINE',
        });
      }
    });
  });

  return io;
}

/**
 * Get active Socket.IO server instance.
 */
function getIO() {
  return io;
}

/**
 * Emit real-time notification to a specific user.
 * Sent exclusively to the recipient's private user channel.
 */
function emitNotificationToUser(userId, notificationPayload) {
  if (!io || !userId) return;
  io.to(`user_${userId}`).emit('notification', notificationPayload);
}

/**
 * Emit real-time workspace event with security isolation.
 */
function emitWorkspaceEvent(workspaceId, eventName, payload, options = {}) {
  if (!io || !workspaceId) return;

  const { isInternal = true, clientId = null } = options;

  // 1. Always emit to agency workspace team members
  io.to(`workspace_${workspaceId}`).emit(eventName, payload);

  // 2. Only emit to client room if event is NOT internal
  if (!isInternal && clientId) {
    io.to(`client_${clientId}`).emit(eventName, payload);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitNotificationToUser,
  emitWorkspaceEvent,
};
