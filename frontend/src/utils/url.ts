/**
 * Utilitaire pour gérer les URLs de redirection
 */

/**
 * Retourne l'URL de base de l'application en fonction de l'environnement
 * Utilise les variables d'environnement de Netlify si disponibles
 */
export const getSiteUrl = (): string => {
  // Netlify fournit cette variable en production
  const netlifyUrl = import.meta.env.VITE_SITE_URL || 'https://airhost-prod.netlify.app';
  
  // En développement local
  const localUrl = window.location.origin;
  
  // Utiliser l'URL de Netlify en production, sinon l'URL locale
  const baseUrl = import.meta.env.PROD ? netlifyUrl : localUrl;
  
  // S'assurer que l'URL se termine par un slash
  const finalUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  
  // Log pour débogage
  console.log('Environnement:', import.meta.env.PROD ? 'Production' : 'Développement');
  console.log('URL du site:', finalUrl);
  
  return finalUrl;
};

/**
 * Retourne l'URL de redirection pour l'authentification
 * @param path Chemin optionnel à ajouter à l'URL de base
 */
export const getRedirectUrl = (path: string = ''): string => {
  const baseUrl = getSiteUrl();
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const redirectUrl = `${baseUrl}${cleanPath}`;
  
  // Log pour débogage
  console.log('URL de redirection:', redirectUrl);
  
  return redirectUrl;
};
