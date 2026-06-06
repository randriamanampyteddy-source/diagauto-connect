const db = require('../config/db');

const normalizeNumber = (value) => {
  let number = String(value || '').replace(/\D/g, '');
  if (number.startsWith('00')) number = number.slice(2);
  if (number.startsWith('0')) number = `261${number.slice(1)}`;
  if (number.length < 8 || number.length > 15) return '';
  return number;
};

const buildManualWhatsApp = (destinataire, message, erreur) => ({
  statut: 'manuel',
  mode: 'manuel',
  destinataire,
  erreur,
  lien_whatsapp: `https://wa.me/${destinataire}?text=${encodeURIComponent(message)}`,
  lien_app: `whatsapp://send?phone=${destinataire}&text=${encodeURIComponent(message)}`,
});

const logNotification = async ({ clientId, type, destinataire, message, statut, erreur = null }) => {
  try {
    await db.query(
      `INSERT INTO notifications_whatsapp (client_id, type, destinataire, message, statut, erreur)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [clientId, type, destinataire || null, message, statut, erreur]
    );
  } catch (err) {
    console.error('Impossible de journaliser la notification WhatsApp:', err.message);
  }
};

const getConfiguration = () => {
  const token = String(process.env.WHATSAPP_API_TOKEN || '').trim();
  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const graphVersion = String(process.env.WHATSAPP_GRAPH_VERSION || 'v21.0').trim();
  const clientUrl = String(process.env.APP_CLIENT_URL || '').trim().replace(/\/$/, '');
  const clientUrlUtilisable = Boolean(
    clientUrl
    && /^https?:\/\//i.test(clientUrl)
    && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(clientUrl)
  );

  return {
    token,
    phoneNumberId,
    graphVersion,
    clientUrl,
    clientUrlUtilisable,
    configure: Boolean(token && phoneNumberId),
  };
};

const fetchAvecTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

exports.getConfigurationWhatsApp = () => {
  const config = getConfiguration();
  return {
    configure: config.configure,
    graph_version: config.graphVersion,
    phone_number_id_present: Boolean(config.phoneNumberId),
    api_token_present: Boolean(config.token),
    phone_number_id_masque: config.phoneNumberId
      ? `${config.phoneNumberId.slice(0, 4)}...${config.phoneNumberId.slice(-4)}`
      : null,
    app_client_url: config.clientUrl || null,
    app_client_url_utilisable: config.clientUrlUtilisable,
  };
};

exports.verifierConfigurationWhatsApp = async () => {
  const config = getConfiguration();
  if (!config.configure) {
    return {
      valide: false,
      statut: 'configuration_manquante',
      message: 'WHATSAPP_PHONE_NUMBER_ID et WHATSAPP_API_TOKEN sont obligatoires.',
    };
  }

  try {
    const response = await fetchAvecTimeout(
      `https://graph.facebook.com/${config.graphVersion}/${encodeURIComponent(config.phoneNumberId)}?fields=display_phone_number,verified_name,quality_rating`,
      { headers: { Authorization: `Bearer ${config.token}` } }
    );
    const data = await response.json();
    if (!response.ok) {
      return {
        valide: false,
        statut: 'echec',
        message: data?.error?.message || `WhatsApp HTTP ${response.status}`,
        code: data?.error?.code || response.status,
      };
    }
    return {
      valide: true,
      statut: 'configure',
      message: 'Connexion WhatsApp Cloud API valide.',
      compte: {
        numero: data.display_phone_number || null,
        nom_verifie: data.verified_name || null,
        qualite: data.quality_rating || null,
      },
    };
  } catch (err) {
    return {
      valide: false,
      statut: 'echec',
      message: err.name === 'AbortError' ? 'Délai de connexion WhatsApp dépassé.' : err.message,
    };
  }
};

exports.envoyerWhatsAppClient = async ({ clientId, type, message }) => {
  let destinataire = null;
  try {
    const [[client]] = await db.query(
      'SELECT whatsapp, telephone FROM clients WHERE id = ?',
      [clientId]
    );
    if (!client) {
      return { statut: 'echec', erreur: 'Client introuvable.' };
    }

    destinataire = normalizeNumber(client.whatsapp || client.telephone);
    if (!destinataire) {
      const erreur = 'Numéro WhatsApp ou téléphone manquant/invalide.';
      await logNotification({ clientId, type, destinataire, message, statut: 'numero_manquant', erreur });
      return { statut: 'numero_manquant', erreur };
    }

    const config = getConfiguration();
    if (!config.configure) {
      const erreur = 'WhatsApp automatique non configure. Envoi manuel disponible.';
      await logNotification({ clientId, type, destinataire, message, statut: 'manuel', erreur });
      return buildManualWhatsApp(destinataire, message, erreur);
    }

    const response = await fetchAvecTimeout(`https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: destinataire,
        type: 'text',
        text: { preview_url: true, body: message },
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `WhatsApp HTTP ${response.status}`);
    await logNotification({ clientId, type, destinataire, message, statut: 'envoye' });
    return { statut: 'envoye', message_id: data?.messages?.[0]?.id };
  } catch (err) {
    const erreur = err.name === 'AbortError' ? 'Délai d’envoi WhatsApp dépassé.' : err.message;
    await logNotification({ clientId, type, destinataire, message, statut: 'echec', erreur });
    if (destinataire) {
      return buildManualWhatsApp(destinataire, message, erreur);
    }
    return { statut: 'echec', erreur };
  }
};
