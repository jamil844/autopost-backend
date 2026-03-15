// publishers/linkedin.js — Publication sur LinkedIn
// Utilise l'API officielle LinkedIn via des requêtes HTTP

const axios = require('axios');

/**
 * Publie un post LinkedIn
 * @param {string} content - Le texte du post
 * @returns {object} - La réponse de l'API LinkedIn
 */
async function publishToLinkedIn(content) {
  // Vérifie que les tokens sont configurés
  if (!process.env.LINKEDIN_ACCESS_TOKEN || !process.env.LINKEDIN_PERSON_ID) {
    throw new Error('Tokens LinkedIn manquants dans .env');
  }

  // Structure du post selon l'API LinkedIn
  const postData = {
    author: `urn:li:person:${process.env.LINKEDIN_PERSON_ID}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: content
        },
        shareMediaCategory: 'NONE'
      }
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
    }
  };

  // Envoie la requête à l'API LinkedIn
  const response = await axios.post(
    'https://api.linkedin.com/v2/ugcPosts',
    postData,
    {
      headers: {
        'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    }
  );

  console.log(`✅ Post LinkedIn publié : ID ${response.data.id}`);
  return response.data;
}

module.exports = { publishToLinkedIn };
