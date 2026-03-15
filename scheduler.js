// scheduler.js — Le cœur de l'automatisation
// Vérifie toutes les minutes si des posts doivent être publiés

const cron = require('node-cron');
const db = require('./db');
const { publishNowWithBuffer } = require('./publishers/buffer');

/**
 * Publie un post via Buffer
 * Buffer gère toutes les plateformes : TikTok, Instagram, Twitter, LinkedIn
 */
async function publishPost(post) {
  console.log(`\n🚀 Publication post #${post.id} sur ${post.platform} via Buffer...`);
  console.log(`   Contenu : "${post.content.slice(0, 60)}..."`);

  if (!post.buffer_access_token) {
    throw new Error('Token Buffer manquant pour cet utilisateur');
  }

  return await publishNowWithBuffer(
    post.buffer_access_token,
    post.channel_id,
    post.content
  );
}

/**
 * Vérifie et publie tous les posts dont l'heure est passée
 * Cette fonction tourne toutes les minutes via node-cron
 */
async function checkAndPublish() {
  // Récupère les posts dont l'heure de publication est passée
  const duePosts = db.getDuePosts();

  if (duePosts.length === 0) return; // Rien à faire

  console.log(`\n⏰ ${duePosts.length} post(s) à publier...`);

  // Publie chaque post un par un
  for (const post of duePosts) {
    try {
      // Tente la publication
      await publishPost(post);

      // Succès → met à jour le statut dans la BDD
      db.markAsPublished(post.id);
      console.log(`✅ Post #${post.id} publié avec succès !`);

    } catch (error) {
      // Échec → enregistre l'erreur dans la BDD
      const errorMsg = error.message || 'Erreur inconnue';
      db.markAsFailed(post.id, errorMsg);
      console.error(`❌ Échec post #${post.id} : ${errorMsg}`);
    }
  }
}

/**
 * Démarre le scheduler
 * '* * * * *' = toutes les minutes
 * Format cron : secondes minutes heures jours mois jour-semaine
 */
function startScheduler() {
  console.log('⚡ Scheduler démarré — vérification toutes les minutes');

  // Vérification immédiate au démarrage
  checkAndPublish();

  // Puis toutes les minutes
  cron.schedule('* * * * *', () => {
    checkAndPublish();
  });
}

module.exports = { startScheduler };
