const mongoose = require('mongoose');
const { ErreurRequete } = require('./reponse');

// Un paramètre de query doit être une chaîne simple (rejette ?x[$ne]=1 et ?x=a&x=b).
const texte = (valeur, nom) => {
  if (typeof valeur !== 'string') throw new ErreurRequete(`Paramètre '${nom}' invalide`);
  return valeur.trim();
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Filtre exact limité à une liste de valeurs autorisées.
const filtreEnum = (valeur, nom, valeursAutorisees) => {
  const v = texte(valeur, nom);
  if (!valeursAutorisees.includes(v)) {
    throw new ErreurRequete(`Paramètre '${nom}' invalide (valeurs : ${valeursAutorisees.join(', ')})`);
  }
  return v;
};

const filtreObjectId = (valeur, nom) => {
  const v = texte(valeur, nom);
  if (!mongoose.isValidObjectId(v)) throw new ErreurRequete(`Paramètre '${nom}' invalide`);
  return v;
};

// Regex insensible à la casse sur plusieurs champs, caractères spéciaux échappés.
const filtreRecherche = (valeur, champs) => {
  const v = texte(valeur, 'search');
  if (!v) return null;
  const regex = new RegExp(escapeRegex(v), 'i');
  return { $or: champs.map((champ) => ({ [champ]: regex })) };
};

const entierPositif = (valeur, nom, defaut, max = Infinity) => {
  if (valeur === undefined) return defaut;
  const v = texte(valeur, nom);
  const n = Number(v);
  if (!/^\d+$/.test(v) || n < 1 || n > max) {
    throw new ErreurRequete(
      `Paramètre '${nom}' invalide (entier entre 1 et ${max === Infinity ? '∞' : max})`
    );
  }
  return n;
};

const pagination = (query) => {
  const page = entierPositif(query.page, 'page', 1);
  const limit = entierPositif(query.limit, 'limit', 10, 100);
  return { page, limit, skip: (page - 1) * limit };
};

// Tri sur un champ autorisé ; _id départage les égalités pour une pagination stable.
const tri = (query, champsAutorises, champDefaut) => {
  const champ =
    query.sort === undefined ? champDefaut : filtreEnum(query.sort, 'sort', champsAutorises);
  const ordre = query.order === undefined ? 'desc' : filtreEnum(query.order, 'order', ['asc', 'desc']);
  const sens = ordre === 'asc' ? 1 : -1;
  return { [champ]: sens, _id: sens };
};

const parserDate = (valeur, nom, finDeJournee = false) => {
  const v = texte(valeur, nom);
  const date = new Date(v);
  if (Number.isNaN(date.getTime())) throw new ErreurRequete(`Paramètre '${nom}' invalide (date attendue)`);
  // dateFin au format AAAA-MM-JJ : on inclut toute la journée.
  if (finDeJournee && /^\d{4}-\d{2}-\d{2}$/.test(v)) date.setUTCHours(23, 59, 59, 999);
  return date;
};

const infosPagination = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

module.exports = {
  filtreEnum,
  filtreObjectId,
  filtreRecherche,
  pagination,
  tri,
  parserDate,
  infosPagination,
};
