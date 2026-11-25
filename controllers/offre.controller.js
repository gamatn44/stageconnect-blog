const asyncHandler = require('../utils/asyncHandler');
const offreService = require('../services/offre.service');
const statsService = require('../services/stats.service');
const dupService = require('../services/duplicate.service');
const importService = require('../services/import.service');
const { cloturerExpirees } = require('../services/cloture.service');

exports.list = asyncHandler(async (req, res) => {
  const { data, pagination } = await offreService.list(req.query, req.user);
  res.json({ success: true, data, pagination });
});

exports.getOne = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await offreService.getById(req.params.id) });
});

exports.create = asyncHandler(async (req, res) => {
  const { offre, doublons } = await offreService.create(req.body, req.user, { force: req.query.force === true });
  res.status(201).json({
    success: true,
    data: offre,
    ...(doublons.length && { warning: 'Publiée malgré des doublons potentiels', doublons }),
  });
});

exports.update = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await offreService.update(req.params.id, req.body, req.user) });
});

exports.cloturer = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await offreService.cloturer(req.params.id, req.user) });
});

exports.remove = asyncHandler(async (req, res) => {
  await offreService.remove(req.params.id, req.user);
  res.status(204).end();
});

exports.stats = asyncHandler(async (req, res) => {
  const scope = req.user.role === 'admin' ? {} : { entrepriseId: req.user.id };
  res.json({ success: true, data: await statsService.getStats(scope) });
});

// --- doublons ---
exports.doublons = asyncHandler(async (req, res) => {
  const scope = req.user.role === 'admin' ? {} : { entrepriseId: req.user.id };
  res.json({ success: true, data: await dupService.listFlagged(scope) });
});
exports.scanDoublons = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await dupService.scanAll() });
});

// --- clôture auto (déclenchement manuel, utile en démo) ---
exports.runCloture = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { cloturees: await cloturerExpirees() } });
});

// --- shopping externe ---
exports.shopPreview = asyncHandler(async (req, res) => {
  const { domaine, items, keywords, providers } = await importService.shop(req.query);
  res.json({ success: true, domaine: domaine.nom, keywords, providers, count: items.length, data: items });
});
exports.shopImport = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await importService.importOffers(req.query) });
});

// --- route interne (service Candidatures) ---
exports.verification = asyncHandler(async (req, res) => {
  const r = await offreService.verification(req.params.id);
  if (!r.found) return res.status(404).json({ success: false, ...r });
  res.status(r.ouverte ? 200 : 409).json({ success: r.ouverte, ...r });
});
