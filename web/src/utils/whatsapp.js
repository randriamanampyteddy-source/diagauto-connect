export const getWhatsAppWarning = (resultat, action) => {
  if (!resultat || resultat.statut === 'envoye') return null
  if (resultat.statut === 'numero_manquant') {
    return `${action}, mais le numéro WhatsApp/téléphone du client est manquant ou invalide.`
  }
  if (resultat.statut === 'configuration_manquante') {
    return `${action}, mais WhatsApp automatique n’est pas configuré sur le serveur.`
  }
  return `${action}, mais l’envoi WhatsApp a échoué${resultat.erreur ? ` : ${resultat.erreur}` : '.'}`
}
