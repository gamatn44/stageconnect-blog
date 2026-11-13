const nodemailer = require('nodemailer');
const config = require('../config/mail.config');
const { dureeVerificationEmailHeures, dureeCodeReinitialisationMinutes } = require('../config/auth.config');

let transporter;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.password },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporter;
};

const echapperHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const construireLienVerification = (token) => `${config.appUrl}/api/auth/verifier-email/${token}`;

// Gabarit commun à tous les mails : bandeau StageConnect + contenu.
const habiller = (contenu) => `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2933;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#1d4ed8;padding:20px 32px;color:#ffffff;font-size:20px;font-weight:bold;">StageConnect</td></tr>
        <tr><td style="padding:32px;">${contenu}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const gabaritVerification = (prenom, lien) =>
  habiller(`
          <h1 style="margin:0 0 16px;font-size:20px;">Bienvenue ${echapperHtml(prenom)} !</h1>
          <p style="margin:0 0 16px;line-height:1.5;">Merci de votre inscription sur StageConnect. Pour activer votre compte, confirmez votre adresse email :</p>
          <p style="margin:24px 0;text-align:center;">
            <a href="${lien}" style="background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;display:inline-block;">Vérifier mon email</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#52606d;">Ce lien est valable ${dureeVerificationEmailHeures} heures. Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :</p>
          <p style="margin:0 0 16px;font-size:13px;word-break:break-all;"><a href="${lien}" style="color:#1d4ed8;">${lien}</a></p>
          <p style="margin:0;font-size:13px;color:#52606d;">Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement ce message.</p>`);

const gabaritReinitialisation = (prenom, code) =>
  habiller(`
          <h1 style="margin:0 0 16px;font-size:20px;">Bonjour ${echapperHtml(prenom)},</h1>
          <p style="margin:0 0 16px;line-height:1.5;">Vous avez demandé la réinitialisation de votre mot de passe StageConnect. Voici votre code de vérification :</p>
          <p style="margin:24px 0;text-align:center;">
            <span style="background:#eff4ff;color:#1d4ed8;border:1px solid #c7d7fe;border-radius:6px;padding:14px 28px;font-size:32px;font-weight:bold;letter-spacing:8px;display:inline-block;">${code}</span>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#52606d;">Ce code est valable ${dureeCodeReinitialisationMinutes} minutes et ne peut être utilisé qu'une seule fois. Ne le communiquez à personne.</p>
          <p style="margin:0;font-size:13px;color:#52606d;">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.</p>`);

const gabaritConfirmation = (prenom) =>
  habiller(`
          <h1 style="margin:0 0 16px;font-size:20px;">Bonjour ${echapperHtml(prenom)},</h1>
          <p style="margin:0 0 16px;line-height:1.5;"><strong>Votre mot de passe a été modifié.</strong> Toutes vos sessions ouvertes ont été déconnectées : reconnectez-vous avec votre nouveau mot de passe.</p>
          <p style="margin:0;font-size:13px;color:#52606d;">Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement l'administration de StageConnect.</p>`);

// Envoie un mail. Ne lève jamais d'erreur : retourne true si le serveur SMTP l'a accepté.
const envoyer = async ({ to, subject, text, html }) => {
  try {
    await getTransporter().sendMail({ from: config.from, to, subject, text, html });
    return true;
  } catch (err) {
    console.error(`Échec de l'envoi du mail à ${to} :`, err.message);
    return false;
  }
};

// Envoie le mail de vérification. Le résultat indique ce qui s'est passé :
//   modeConsole : MAIL_USER vide, rien n'est envoyé et le lien est affiché dans la console.
//   envoye      : true si le mail a bien été remis au serveur SMTP.
exports.envoyerEmailVerification = async (user, token) => {
  const lien = construireLienVerification(token);

  if (config.modeConsole) {
    console.log(`[MAIL - mode développement] Lien de vérification pour ${user.email} : ${lien}`);
    return { envoye: false, modeConsole: true, lien };
  }

  const envoye = await envoyer({
    to: user.email,
    subject: 'StageConnect : confirmez votre adresse email',
    text: `Bonjour ${user.prenom},\n\nConfirmez votre adresse email en ouvrant ce lien (valable ${dureeVerificationEmailHeures} h) :\n${lien}\n\nSi vous n'êtes pas à l'origine de cette inscription, ignorez ce message.`,
    html: gabaritVerification(user.prenom, lien),
  });
  return { envoye, modeConsole: false, lien };
};

// Mail contenant le code de réinitialisation à 6 chiffres.
exports.envoyerEmailReinitialisation = async (user, code) => {
  if (config.modeConsole) {
    console.log(`[MAIL - mode développement] Code de réinitialisation pour ${user.email} : ${code}`);
    return { envoye: false, modeConsole: true, code };
  }

  const envoye = await envoyer({
    to: user.email,
    subject: 'StageConnect : votre code de réinitialisation',
    text: `Bonjour ${user.prenom},\n\nVotre code de réinitialisation du mot de passe : ${code}\nIl est valable ${dureeCodeReinitialisationMinutes} minutes et ne peut être utilisé qu'une seule fois.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    html: gabaritReinitialisation(user.prenom, code),
  });
  return { envoye, modeConsole: false };
};

// Mail de confirmation après un changement de mot de passe (ne contient aucun secret).
exports.envoyerEmailConfirmationMotDePasse = async (user) => {
  if (config.modeConsole) {
    console.log(`[MAIL - mode développement] Confirmation de changement de mot de passe pour ${user.email}`);
    return { envoye: false, modeConsole: true };
  }

  const envoye = await envoyer({
    to: user.email,
    subject: 'StageConnect : votre mot de passe a été modifié',
    text: `Bonjour ${user.prenom},\n\nVotre mot de passe a été modifié. Toutes vos sessions ont été déconnectées.\n\nSi vous n'êtes pas à l'origine de ce changement, contactez immédiatement l'administration.`,
    html: gabaritConfirmation(user.prenom),
  });
  return { envoye, modeConsole: false };
};
