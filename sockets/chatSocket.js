// sockets/chatSocket.js
const jwt = require('jsonwebtoken');
const db  = require('../config/db');

module.exports = (io) => {
  // Authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('No token'));
      const { userId } = jwt.verify(token, process.env.JWT_SECRET);
      const [rows] = await db.query(
        'SELECT u.user_id, a.anon_id FROM Users u LEFT JOIN Anonymous_ID a ON u.user_id=a.user_id WHERE u.user_id=?',
        [userId]
      );
      if (!rows.length) return next(new Error('User not found'));
      socket.userId = rows[0].user_id;
      socket.anonId = rows[0].anon_id;
      next();
    } catch { next(new Error('Invalid token')); }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Connected: ${socket.anonId}`);

    socket.on('join_group', groupId => socket.join(`group_${groupId}`));
    socket.on('leave_group', groupId => socket.leave(`group_${groupId}`));

    socket.on('group_message', async ({ groupId, content }) => {
      if (!content?.trim()) return;
      const [member] = await db.query(
        'SELECT id FROM Group_Members WHERE group_id=? AND user_id=?',
        [groupId, socket.userId]
      );
      if (!member.length) return;
      const [r] = await db.query(
        'INSERT INTO Group_Posts (group_id, user_id, content) VALUES (?,?,?)',
        [groupId, socket.userId, content]
      );
      io.to(`group_${groupId}`).emit('group_post', {
        post_id: r.insertId, group_id: groupId,
        author: socket.anonId, content, posted_at: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => console.log(`🔌 Disconnected: ${socket.anonId}`));
  });
};
