export const getWhatsAppWarning = (resultat, action) => {
  if (!resultat || resultat.statut === 'envoye') return null
  if (resultat.statut === 'manuel') {
    return `${action}. WhatsApp simple va s'ouvrir avec le message deja prepare. Il reste seulement a appuyer sur Envoyer.`
  }
  if (resultat.statut === 'numero_manquant') {
    return `${action}, mais le numero WhatsApp/telephone du client est manquant ou invalide.`
  }
  if (resultat.statut === 'configuration_manquante') {
    return `${action}, mais WhatsApp automatique n'est pas configure sur le serveur.`
  }
  return `${action}, mais l'envoi WhatsApp a echoue${resultat.erreur ? ` : ${resultat.erreur}` : '.'}`
}

export const ouvrirWhatsAppManuel = (resultat) => {
  if (!resultat?.lien_whatsapp && !resultat?.lien_app) return false

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')
  const appLink = resultat.lien_app || resultat.lien_whatsapp
  const webLink = resultat.lien_whatsapp || appLink

  try {
    if (isMobile && resultat.lien_app) {
      window.location.href = appLink
      setTimeout(() => {
        window.location.href = webLink
      }, 1200)
      return true
    }

    const opened = window.open(webLink, '_blank', 'noopener,noreferrer')
    if (!opened) window.location.href = webLink
    return true
  } catch {
    window.location.href = webLink
    return true
  }
}
