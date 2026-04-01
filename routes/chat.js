const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const db = require('../config/db');

router.get('/', authenticate, async (req, res) => {
  const [chats] = await db.query(
    `SELECT c.chat_id,c.created_at,a1.anon_id AS user1_anon,a2.anon_id AS user2_anon
     FROM Chats c
     LEFT JOIN Anonymous_ID a1 ON c.user1_id=a1.user_id
     LEFT JOIN Anonymous_ID a2 ON c.user2_id=a2.user_id
     WHERE c.user1_id=? OR c.user2_id=?`,
    [req.user.user_id, req.user.user_id]
  );
  res.json(chats);
});

router.post('/start', authenticate, async (req, res) => {
  const { anon_id } = req.body;
  if (!anon_id) return res.status(400).json({ error: 'anon_id required' });
  const [target] = await db.query('SELECT user_id FROM Anonymous_ID WHERE anon_id=?', [anon_id]);
  if (!target.length) return res.status(404).json({ error: 'User not found' });
  const u1 = Math.min(req.user.user_id, target[0].user_id);
  const u2 = Math.max(req.user.user_id, target[0].user_id);
  if (u1 === u2) return res.status(400).json({ error: 'Cannot chat with yourself' });
  const [ex] = await db.query('SELECT chat_id FROM Chats WHERE user1_id=? AND user2_id=?', [u1,u2]);
  if (ex.length) return res.json({ chat_id: ex[0].chat_id, created: false });
  const [r] = await db.query('INSERT INTO Chats (user1_id,user2_id) VALUES (?,?)', [u1,u2]);
  res.json({ chat_id: r.insertId, created: true });
});

router.get('/:chatId/messages', authenticate, async (req, res) => {
  const { chatId } = req.params;
  const [chat] = await db.query(
    'SELECT * FROM Chats WHERE chat_id=? AND (user1_id=? OR user2_id=?)',
    [chatId, req.user.user_id, req.user.user_id]
  );
  if (!chat.length) return res.status(403).json({ error: 'Access denied' });
  const [messages] = await db.query(
    `SELECT m.message_id,m.content,m.sent_at,a.anon_id AS sender
     FROM Messages m LEFT JOIN Anonymous_ID a ON m.sender_id=a.user_id
     WHERE m.chat_id=? ORDER BY m.sent_at ASC LIMIT 100`,
    [chatId]
  );
  await db.query('UPDATE Messages SET is_read=TRUE WHERE chat_id=? AND sender_id!=?',
    [chatId, req.user.user_id]);
  res.json(messages);
});

module.exports = router;
