const router = require('express').Router();
const c = require('../controllers/offre.controller');
const v = require('../validators/offre.validator');
const validate = require('../middlewares/validate');
const { authenticate, authorize, requireValidatedCompany } = require('../middlewares/auth');

router.use(authenticate);

// --- routes statiques AVANT /:id ---
router.get('/stats', authorize('admin', 'entreprise'), c.stats);
router.get('/doublons', authorize('admin', 'entreprise'), c.doublons);
router.post('/doublons/scan', authorize('admin'), c.scanDoublons);
router.post('/cloture/run', authorize('admin'), c.runCloture);
router.get('/externes/preview', authorize('admin', 'entreprise', 'etudiant'), validate(v.shopping, 'query'), c.shopPreview);
router.post('/externes/import', authorize('admin'), validate(v.shopping, 'query'), c.shopImport);

// --- CRUD + recherche ---
router.get('/', validate(v.list, 'query'), c.list);
router.post('/', authorize('entreprise', 'admin'), requireValidatedCompany, validate(v.forceQuery, 'query'), validate(v.create), c.create);
router.get('/:id', c.getOne);
router.put('/:id', authorize('entreprise', 'admin'), validate(v.update), c.update);
router.patch('/:id/cloturer', authorize('entreprise', 'admin'), c.cloturer);
router.delete('/:id', authorize('entreprise', 'admin'), c.remove);

module.exports = router;
