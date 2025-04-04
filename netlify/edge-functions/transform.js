// Fonction de transformation Netlify pour injecter le script de correction du service worker
export default async (request, context) => {
  const response = await context.next();
  const contentType = response.headers.get('content-type');
  
  // Ne traiter que les pages HTML
  if (contentType && contentType.includes('text/html')) {
    let html = await response.text();
    
    // Injecter notre script de correction juste avant la fermeture de la balise body
    const scriptTag = '<script src="/sw-patch.js"></script>';
    html = html.replace('</body>', `${scriptTag}</body>`);
    
    // Retourner la page HTML modifiée
    return new Response(html, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    });
  }
  
  // Pour les autres types de contenu, retourner la réponse originale
  return response;
};
