require('dotenv').config({ quiet: true });

const port = Number(process.env.MAIL_PORT) || 465;
const user = (process.env.MAIL_USER || '').trim();

module.exports = {
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port,
  secure: port === 465,
  user,
  password: process.env.MAIL_PASSWORD || '',
  from:
    process.env.MAIL_FROM ||
    (user ? `StageConnect <${user}>` : 'StageConnect <no-reply@stageconnect.local>'),
  appUrl: (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, ''),

  // MAIL_USER vide : aucun mail n'est envoyé, le lien est affiché dans la console (développement, Newman).
  modeConsole: !user,
};
