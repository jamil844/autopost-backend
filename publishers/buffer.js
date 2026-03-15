// publishers/buffer.js — Publication via l'API Buffer
// Buffer gère TikTok, Instagram, Twitter, LinkedIn en un seul endroit

const axios = require('axios');

const BUFFER_API = 'https://api.bufferapp.com/1';

/**
 * Récupère les canaux connectés du compte Buffer de l'utilisateur
 * (ex: son TikTok, son Instagram, son Twitter...)
 *
 * @param {string} accessToken - Token Buffer de l'utilisateur
 * @returns {Array} - Liste des canaux avec id, nom, type
 */
async function getBufferChannels(accessToken) {
  const response = await axios.get(`${BUFFER_API}/profiles.json`, {
    params: { access_token: accessToken }
  });

  // Formate les canaux pour notre app
  return response.data.map(profile => ({
    id:       profile.id,
    name:     profile.formatted_username,
    platform: profile.service,           // 'twitter', 'tiktok', 'instagram'...
    avatar:   profile.avatar_https,
  }));
}

/**
 * Programme un post sur Buffer
 * Buffer s'occupe de le publier à l'heure choisie
 *
 * @param {string} accessToken  - Token Buffer de l'utilisateur
 * @param {string} channelId    - ID du canal Buffer (TikTok, Insta...)
 * @param {string} content      - Texte du post
 * @param {string} scheduledAt  - Date/heure ISO (ex: "2025-03-20T14:30:00")
 * @returns {object}            - La réponse Buffer avec l'ID du post
 */
async function scheduleWithBuffer(accessToken, channelId, content, scheduledAt) {
  // Convertit la date en timestamp Unix (requis par Buffer)
  const scheduledTimestamp = Math.floor(new Date(scheduledAt).getTime() / 1000);

  const response = await axios.post(
    `${BUFFER_API}/updates/create.json`,
    null,
    {
      params: {
        access_token:  accessToken,
        profile_ids[]: channelId,
        text:          content,
        scheduled_at:  scheduledTimestamp,
      }
    }
  );

  if (!response.data.success) {
    throw new Error(`Buffer error: ${response.data.message || 'Échec de la publication'}`);
  }

  const update = response.data.updates?.[0];
  console.log(`✅ Post programmé sur Buffer : ID ${update?.id}`);
  return update;
}

/**
 * Publie immédiatement un post via Buffer (sans attendre)
 *
 * @param {string} accessToken - Token Buffer de l'utilisateur
 * @param {string} channelId   - ID du canal Buffer
 * @param {string} content     - Texte du post
 */
async function publishNowWithBuffer(accessToken, channelId, content) {
  const response = await axios.post(
    `${BUFFER_API}/updates/create.json`,
    null,
    {
      params: {
        access_token:  accessToken,
        'profile_ids[]': channelId,
        text:          content,
        now:           true,             // Publication immédiate
      }
    }
  );

  if (!response.data.success) {
    throw new Error(`Buffer error: ${response.data.message || 'Échec de la publication'}`);
  }

  return response.data.updates?.[0];
}

module.exports = {
  getBufferChannels,
  scheduleWithBuffer,
  publishNowWithBuffer,
};
