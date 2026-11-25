const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/domaine.service');

exports.list = asyncHandler(async (req, res) => {
  const actif = req.query.actif === undefined ? undefined : req.query.actif === 'true';
  res.json({ success: true, data: await svc.list({ actif }) });
});
exports.getOne = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.getById(req.params.id) }));
exports.create = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await svc.create(req.body) }));
exports.update = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.update(req.params.id, req.body) }));
exports.remove = asyncHandler(async (req, res) => { await svc.remove(req.params.id); res.status(204).end(); });
