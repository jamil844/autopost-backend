// auth.js — Gestion de l'authentification Buffer via OAuth 2.0
//
// Le flux OAuth fonctionne en 3 étapes :
// 1. On redirige l'utilisateur vers Buffer pour qu'il autorise l'app
// 2. Buffer redirige vers notre callback avec un "code"
// 3. On échange ce "code" contre un vrai token d'accès

const axios  = require('axios');
const { v4: uuidv4 } = require('uuid');
const db     = require('./db');
const { getBufferChannels } = require('./publishers/buffer');

const BUFFER_AUTH_URL  = 'https://bufferapp.com/oauth2/authorize';
const BUFFER_TOKEN_URL = 'https://api.bufferapp.com/1/oauth2/token.json';

// Stocke les états OAuth temporaires (anti-CSRF)
// En production → utilise une vraie session ou Redis
const pendingStates = new Map();

/**
 * ÉTAPE 1 — Génère l'URL de connexion Buffer
 * L'utilisateur clique sur "Connecter Buffer" → on l'envoie ici
 */
function getBufferAuthUrl(userId) {
  // Génère un état aléatoire pour sécuriser le callback
  const state = uuidv4();
  pendingStates.set(state, { userId, createdAt: Date.now() });

  // Nettoie les états de plus de 10 minutes
  for (const [key, val] of pendingStates.entries()) {
    if (Date.now() - val.createdAt > 600000) pendingStates.delete(key);
  }

  // Construit l'URL d'autorisation Buffer
  const params = new URLSearchParams({
    client_id:     process.env.BUFFER_CLIENT_ID,
    redirect_uri:  process.env.BUFFER_REDIRECT_URI,
    response_type: 'code',
    state,
  });

  return `${BUFFER_AUTH_URL}?${params.toString()}`;
}

/**
 * ÉTAPE 2 — Buffer nous renvoie un "code" après autorisation
 * On échange ce code contre un vrai token d'accès
 */
async function handleBufferCallback(code, state) {
  // Vérifie que l'état est valide (sécurité anti-CSRF)
  const pending = pendingStates.get(state);
  if (!pending) {
    throw new Error('État OAuth invalide ou expiré. Reconnecte-toi.');
  }
  pendingStates.delete(state);

  // Échange le code contre un token
  const tokenResponse = await axios.post(BUFFER_TOKEN_URL, {
    client_id:     process.env.BUFFER_CLIENT_ID,
    client_secret: process.env.BUFFER_CLIENT_SECRET,
    redirect_uri:  process.env.BUFFER_REDIRECT_URI,
    code,
    grant_type:    'authorization_code',
  });

  const { access_token, refresh_token, expires_in } = tokenResponse.data;

  // Calcule la date d'expiration du token
  const expiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString();

  // Sauvegarde le token dans la base de données
  const user = db.upsertUser({
    id:                    pending.userId,
    email:                 null, // Buffer ne donne pas l'email
    buffer_access_token:   access_token,
    buffer_refresh_token:  refresh_token || null,
    buffer_expires_at:     expiresAt,
  });

  // Récupère et sauvegarde les canaux connectés (TikTok, Insta, Twitter...)
  try {
    const channels = await getBufferChannels(access_token);
    db.saveUserChannels(pending.userId, channels);
    console.log(`✅ Utilisateur ${pending.userId} connecté — ${channels.length} canal(aux) trouvé(s)`);
  } catch (err) {
    console.warn('⚠️ Impossible de récupérer les canaux Buffer :', err.message);
  }

  return db.getUserById(pending.userId);
}

module.exports = { getBufferAuthUrl, handleBufferCallback };
