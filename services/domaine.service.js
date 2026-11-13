const Domaine = require('../models/Domaine');
const Offre = require('../models/Offre');
const ApiError = require('../utils/ApiError');

const list = ({ actif } = {}) => Domaine.find(actif === undefined ? {} : { actif }).sort('nom');

async function getById(id) {
  const d = await Domaine.findById(id);
  if (!d) throw new ApiError(404, 'Domaine introuvable');
  return d;
}

const create = (data) => Domaine.create(data);

async function update(id, data) {
  const d = await Domaine.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!d) throw new ApiError(404, 'Domaine introuvable');
  return d;
}

async function remove(id) {
  const used = await Offre.countDocuments({ domaine: id });
  if (used > 0) throw new ApiError(409, `Suppression impossible : ${used} offre(s) utilisent ce domaine (désactivez-le plutôt)`);
  const d = await Domaine.findByIdAndDelete(id);
  if (!d) throw new ApiError(404, 'Domaine introuvable');
}

module.exports = { list, getById, create, update, remove };
