const router = require('express').Router();
const c = require('../controllers/domaine.controller');
const v = require('../validators/domaine.validator');
const validate = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);
router.get('/', c.list);
router.get('/:id', c.getOne);
router.post('/', authorize('admin'), validate(v.create), c.create);
router.put('/:id', authorize('admin'), validate(v.update), c.update);
router.delete('/:id', authorize('admin'), c.remove);

module.exports = router;
