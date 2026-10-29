const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Authentication Middleware for Socket Connections
 */
function socketAuthMiddleware(socket, next) {
  const jwtSecret = process.env.JWT_SECRET || 'dev_secret_key_change_in_production';
  try {
    // 1. Extract token from auth payload, authorization header, or handshake query
    let token =
      socket.handshake?.auth?.token ||
      socket.handshake?.headers?.authorization ||
      socket.handshake?.query?.token;

    if (!token) {
      return next(new Error('Authentication error: Token required for socket connection'));
    }

    // Handle "Bearer <token>" format
    if (typeof token === 'string' && token.startsWith('Bearer ')) {
      token = token.slice(7).trim();
    }

    if (!token) {
      return next(new Error('Authentication error: Invalid bearer token format'));
    }

    // 2. Verify JWT signature & expiration
    const decoded = jwt.verify(token, jwtSecret);

    const userId = decoded.id || decoded._id;
    if (!userId) {
      return next(new Error('Authentication error: Invalid token payload'));
    }

    // 3. Attach authenticated user details to socket instance
    socket.user = {
      _id: userId.toString(),
      id: userId.toString(),
      role: decoded.role || 'user',
    };

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }
    return next(new Error('Authentication error: Invalid or malformed token'));
  }
}

/**
 * Handle new authenticated socket connection
 */
function handleSocketConnection(socket) {
  const userId = socket.user?._id;

  if (userId) {
    // Join server-controlled, authenticated user room
    const userRoom = `user:${userId}`;
    socket.join(userRoom);
  }

  // Disconnection handler
  socket.on('disconnect', (reason) => {
    // Clean disconnect
  });

  // Handle booking chat room participation with strict authorization
  socket.on('chat:join_booking', async (data, callback) => {
    try {
      const bookingId = data?.bookingId;
      if (!bookingId || !userId) return;

      const Booking = require('../models/Booking');
      const booking = await Booking.findById(bookingId).select('requester owner');
      if (!booking) return;

      const isParticipant =
        booking.requester.toString() === userId.toString() ||
        booking.owner.toString() === userId.toString();

      if (isParticipant) {
        socket.join(`booking:${bookingId}`);
        if (typeof callback === 'function') callback({ success: true });
      } else {
        if (typeof callback === 'function') callback({ success: false, error: 'Unauthorized' });
      }
    } catch {
      // Safe fallback
    }
  });

  socket.on('chat:leave_booking', (data) => {
    const bookingId = data?.bookingId;
    if (bookingId) {
      socket.leave(`booking:${bookingId}`);
    }
  });

  socket.on('chat:typing', (data) => {
    const { bookingId, recipientId, isTyping } = data || {};
    if (recipientId && userId) {
      emitToUser(recipientId.toString(), 'chat:user_typing', {
        bookingId,
        userId: userId.toString(),
        isTyping: Boolean(isTyping),
      });
    }
  });

  // Guard against client attempts to join unauthorized arbitrary rooms
  socket.on('join_room', () => {
    // Ignored: users cannot join arbitrary rooms
  });
}

/**
 * Configure and attach Socket.IO to the existing HTTP server
 * @param {import('http').Server} httpServer
 */
function initSocket(httpServer) {
  const parseAllowedOrigins = (originString) => {
    if (!originString || originString.trim() === '*' || originString.trim() === '') {
      return ['http://localhost:5173'];
    }
    return originString
      .split(',')
      .map((o) => o.trim().replace(/\/+$/, ''))
      .filter(Boolean);
  };

  const allowedOrigins = parseAllowedOrigins(process.env.CLIENT_URL);

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. server-side/curl/tests)
        if (!origin) return callback(null, true);
        const normalized = origin.trim().replace(/\/+$/, '');
        if (
          process.env.CLIENT_URL === '*' ||
          allowedOrigins.includes('*') ||
          allowedOrigins.includes(normalized)
        ) {
          return callback(null, true);
        }
        return callback(new Error(`CORS policy blocked socket origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(socketAuthMiddleware);
  io.on('connection', handleSocketConnection);

  return io;
}

/**
 * Get active Socket.IO server instance
 */
function getIO() {
  return io;
}

/**
 * Emit an event to a specific user's private room
 * @param {string} userId - Recipient user ID
 * @param {string} eventName - Socket event name (e.g. 'notification:new')
 * @param {any} payload - Event data
 * @returns {boolean} Whether emission was attempted
 */
function emitToUser(userId, eventName, payload) {
  if (!io) {
    return false;
  }

  if (!userId) {
    return false;
  }

  try {
    const targetRoom = `user:${userId.toString()}`;
    io.to(targetRoom).emit(eventName, payload);
    return true;
  } catch (err) {
    console.error('Socket emission failure:', err.message);
    return false;
  }
}

/**
 * Gracefully close Socket.IO server instance
 */
function closeSocket() {
  if (io) {
    io.close();
    io = null;
  }
}

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  closeSocket,
  socketAuthMiddleware,
  handleSocketConnection,
};

