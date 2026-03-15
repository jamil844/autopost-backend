// db.js — Gestion de la base de données SQLite
// SQLite = une base de données stockée dans un simple fichier .db
// Pas besoin d'installer MySQL ou PostgreSQL, tout est local

const Database = require('better-sqlite3');

// Crée (ou ouvre) le fichier de base de données
const db = new Database('autopost.db');

// ─── CRÉATION DES TABLES ───────────────────────────────────────────────
// Une table = un tableau avec des colonnes
// Si les tables existent déjà, elles ne sont pas recréées

db.exec(`
  -- Table des utilisateurs (un par client)
  CREATE TABLE IF NOT EXISTS users (
    id                  TEXT PRIMARY KEY,         -- UUID unique par client
    email               TEXT UNIQUE,
    buffer_access_token  TEXT,                    -- Token Buffer OAuth
    buffer_refresh_token TEXT,                    -- Pour renouveler le token
    buffer_expires_at    TEXT,                    -- Date d'expiration du token
    buffer_channels      TEXT DEFAULT '[]',       -- Canaux connectés (JSON)
    created_at          TEXT DEFAULT (datetime('now'))
  );

  -- Table des posts (liés à un utilisateur)
  CREATE TABLE IF NOT EXISTS posts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT    NOT NULL,                -- Lié à la table users
    content      TEXT    NOT NULL,
    platform     TEXT    NOT NULL,
    channel_id   TEXT,                            -- ID du canal Buffer
    scheduled_at TEXT    NOT NULL,
    status       TEXT    DEFAULT 'scheduled',
    error        TEXT,
    created_at   TEXT    DEFAULT (datetime('now')),
    published_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// ─── FONCTIONS UTILISATEURS ───────────────────────────────────────────

// Créer ou mettre à jour un utilisateur après OAuth Buffer
function upsertUser({ id, email, buffer_access_token, buffer_refresh_token, buffer_expires_at }) {
  db.prepare(`
    INSERT INTO users (id, email, buffer_access_token, buffer_refresh_token, buffer_expires_at)
    VALUES (@id, @email, @buffer_access_token, @buffer_refresh_token, @buffer_expires_at)
    ON CONFLICT(id) DO UPDATE SET
      buffer_access_token  = @buffer_access_token,
      buffer_refresh_token = @buffer_refresh_token,
      buffer_expires_at    = @buffer_expires_at
  `).run({ id, email, buffer_access_token, buffer_refresh_token, buffer_expires_at });
  return getUserById(id);
}

// Récupérer un utilisateur par ID
function getUserById(id) {
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  if (user) user.buffer_channels = JSON.parse(user.buffer_channels || '[]');
  return user;
}

// Sauvegarder les canaux Buffer d'un utilisateur
function saveUserChannels(userId, channels) {
  db.prepare(`UPDATE users SET buffer_channels = ? WHERE id = ?`)
    .run(JSON.stringify(channels), userId);
}

// ─── FONCTIONS D'ACCÈS AUX DONNÉES POSTS ──────────────────────────────

// Récupérer tous les posts d'un utilisateur
function getAllPosts(userId) {
  return db.prepare(`
    SELECT * FROM posts WHERE user_id = ? ORDER BY scheduled_at DESC
  `).all(userId);
}

// Récupérer les posts programmés dont l'heure est passée (tous utilisateurs)
function getDuePosts() {
  return db.prepare(`
    SELECT p.*, u.buffer_access_token
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 'scheduled'
    AND p.scheduled_at <= datetime('now')
    ORDER BY p.scheduled_at ASC
  `).all();
}

// Récupérer un post par son ID
function getPostById(id) {
  return db.prepare(`SELECT * FROM posts WHERE id = ?`).get(id);
}

// Créer un nouveau post
function createPost({ user_id, content, platform, channel_id, scheduled_at }) {
  const stmt = db.prepare(`
    INSERT INTO posts (user_id, content, platform, channel_id, scheduled_at)
    VALUES (@user_id, @content, @platform, @channel_id, @scheduled_at)
  `);
  const result = stmt.run({ user_id, content, platform, channel_id, scheduled_at });
  return getPostById(result.lastInsertRowid);
}

// Marquer un post comme publié
function markAsPublished(id) {
  db.prepare(`
    UPDATE posts
    SET status = 'published', published_at = datetime('now')
    WHERE id = ?
  `).run(id);
}

// Marquer un post comme échoué
function markAsFailed(id, errorMessage) {
  db.prepare(`
    UPDATE posts
    SET status = 'failed', error = ?
    WHERE id = ?
  `).run(errorMessage, id);
}

// Supprimer un post
function deletePost(id) {
  db.prepare(`DELETE FROM posts WHERE id = ?`).run(id);
}

module.exports = {
  // Users
  upsertUser,
  getUserById,
  saveUserChannels,
  // Posts
  getAllPosts,
  getDuePosts,
  getPostById,
  createPost,
  markAsPublished,
  markAsFailed,
  deletePost,
};
