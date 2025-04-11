// Fonction Netlify désactivée - Les notifications FCM sont maintenant gérées par l'Edge Function Supabase
// Mars 2025 - Migration vers Supabase Edge Functions

exports.handler = async (event, context) => {
  // On retourne une réponse indiquant que la fonction a été migrée
  return {
    statusCode: 410, // Gone - indique que la ressource n'est plus disponible
    body: JSON.stringify({ 
      error: "Cette fonction a été désactivée. Les notifications FCM sont désormais gérées par l'Edge Function Supabase.",
      redirectTo: "https://pnbfsiicxhckptlgtjoj.supabase.co/functions/v1/fcm-proxy"
    })
  };
};

