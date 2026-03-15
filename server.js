// server.js — Point d'entrée du backend
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const { v4: uuidv4 } = require('uuid');
const db      = require('./db');
const { startScheduler }        = require('./scheduler');
const { getBufferAuthUrl, handleBufferCallback } = require('./auth');
const { getBufferChannels }     = require('./publishers/buffer');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ── AUTHENTIFICATION BUFFER ───────────────────────────────────────────

// GET /auth/buffer?userId=xxx → URL de connexion Buffer
app.get('/auth/buffer', (req, res) => {
  try {
    const userId = req.query.userId || uuidv4();
    const authUrl = getBufferAuthUrl(userId);
    res.json({ success: true, userId, authUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /auth/buffer/callback → Buffer redirige ici après autorisation
app.get('/auth/buffer/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send('Paramètres manquants');

    const user = await handleBufferCallback(code, state);
    console.log(`🎉 Connexion Buffer réussie : ${user.id}`);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard?userId=${user.id}&connected=true`);
  } catch (error) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?error=${encodeURIComponent(error.message)}`);
  }
});

// ── UTILISATEURS ──────────────────────────────────────────────────────

// GET /users/:userId → Infos utilisateur
app.get('/users/:userId', (req, res) => {
  try {
    const user = db.getUserById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, error: 'Introuvable' });

    const { buffer_access_token, buffer_refresh_token, ...safeUser } = user;
    res.json({ success: true, user: { ...safeUser, isConnected: !!buffer_access_token } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /users/:userId/channels → Canaux Buffer connectés
app.get('/users/:userId/channels', async (req, res) => {
  try {
    const user = db.getUserById(req.params.userId);
    if (!user?.buffer_access_token) {
      return res.status(401).json({ success: false, error: 'Non connecté à Buffer' });
    }
    const channels = await getBufferChannels(user.buffer_access_token);
    db.saveUserChannels(req.params.userId, channels);
    res.json({ success: true, channels });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POSTS ─────────────────────────────────────────────────────────────

// GET /posts?userId=xxx → Tous les posts d'un utilisateur
app.get('/posts', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: 'userId requis' });
    const posts = db.getAllPosts(userId);
    res.json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /posts → Créer un post programmé
app.post('/posts', async (req, res) => {
  try {
    const { userId, content, platform, channelId, scheduled_at } = req.body;

    if (!userId || !content || !platform || !channelId || !scheduled_at) {
      return res.status(400).json({ success: false, error: 'Champs manquants' });
    }
    if (new Date(scheduled_at) <= new Date()) {
      return res.status(400).json({ success: false, error: 'Date doit être dans le futur' });
    }

    const user = db.getUserById(userId);
    if (!user?.buffer_access_token) {
      return res.status(401).json({ success: false, error: 'Connecte ton Buffer d\'abord' });
    }

    const post = db.createPost({ user_id: userId, content, platform, channel_id: channelId, scheduled_at });
    console.log(`📅 Post #${post.id} programmé sur ${platform} à ${scheduled_at}`);
    res.status(201).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /posts/:id → Supprimer un post
app.delete('/posts/:id', (req, res) => {
  try {
    const post = db.getPostById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Post introuvable' });
    if (post.status === 'published') return res.status(400).json({ success: false, error: 'Post déjà publié' });
    db.deletePost(req.params.id);
    res.json({ success: true, message: 'Post supprimé' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /health → Statut du serveur
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ── DÉMARRAGE ─────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 AutoPost Backend → http://localhost:${PORT}`);
  console.log(`   GET  /auth/buffer              → URL connexion Buffer`);
  console.log(`   GET  /auth/buffer/callback      → Callback OAuth`);
  console.log(`   GET  /users/:id                 → Infos utilisateur`);
  console.log(`   GET  /users/:id/channels        → Canaux connectés`);
  console.log(`   GET  /posts?userId=xxx          → Liste des posts`);
  console.log(`   POST /posts                     → Créer un post`);
  console.log(`   DELETE /posts/:id               → Supprimer\n`);
  startScheduler();
});
