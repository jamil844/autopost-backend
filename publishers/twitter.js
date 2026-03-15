// publishers/twitter.js — Publication sur Twitter/X
// Utilise la bibliothèque officielle twitter-api-v2

const { TwitterApi } = require('twitter-api-v2');

// Initialise le client Twitter avec les clés API depuis .env
const client = new TwitterApi({
  appKey:    process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken:  process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

// Client en écriture (pour poster)
const rwClient = client.readWrite;

/**
 * Publie un tweet
 * @param {string} content - Le texte du tweet (max 280 caractères)
 * @returns {object} - La réponse de l'API Twitter
 */
async function publishToTwitter(content) {
  // Vérifie que les clés sont configurées
  if (!process.env.TWITTER_API_KEY) {
    throw new Error('Clés Twitter manquantes dans .env');
  }

  // Tronque le contenu si trop long (sécurité)
  const tweet = content.length > 280 ? content.slice(0, 277) + '...' : content;

  // Envoie le tweet via l'API
  const response = await rwClient.v2.tweet(tweet);

  console.log(`✅ Tweet publié : ID ${response.data.id}`);
  return response.data;
}

module.exports = { publishToTwitter };
