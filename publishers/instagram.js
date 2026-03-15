// publishers/instagram.js — Publication sur Instagram
// Utilise l'API Meta Graph (nécessite un compte Business)

const axios = require('axios');

/**
 * Publie un post Instagram
 * IMPORTANT : Instagram nécessite une IMAGE obligatoirement.
 * Pour du texte seul → utilise une image avec le texte dessus.
 *
 * @param {string} content - La légende du post
 * @param {string} imageUrl - URL publique de l'image (obligatoire)
 * @returns {object} - La réponse de l'API
 */
async function publishToInstagram(content, imageUrl) {
  if (!process.env.INSTAGRAM_ACCESS_TOKEN || !process.env.INSTAGRAM_ACCOUNT_ID) {
    throw new Error('Tokens Instagram manquants dans .env');
  }

  if (!imageUrl) {
    throw new Error('Instagram nécessite une image pour publier');
  }

  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  // Étape 1 : Créer le container média
  const containerResponse = await axios.post(
    `https://graph.facebook.com/v18.0/${accountId}/media`,
    {
      image_url: imageUrl,
      caption: content,
      access_token: token
    }
  );

  const containerId = containerResponse.data.id;
  console.log(`📦 Container Instagram créé : ${containerId}`);

  // Étape 2 : Attendre 3 secondes (requis par Meta)
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Étape 3 : Publier le container
  const publishResponse = await axios.post(
    `https://graph.facebook.com/v18.0/${accountId}/media_publish`,
    {
      creation_id: containerId,
      access_token: token
    }
  );

  console.log(`✅ Post Instagram publié : ID ${publishResponse.data.id}`);
  return publishResponse.data;
}

module.exports = { publishToInstagram };
