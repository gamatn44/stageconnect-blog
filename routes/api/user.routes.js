const express = require('express');
const router = express.Router();
const userController = require('../../controllers/user.controller');
const { authentifier, exigerRole } = require('../../middlewares/auth');

// Tout le CRUD User est réservé aux admins.
router.use(authentifier, exigerRole('admin'));

router.post('/', userController.createUser);
router.get('/', userController.getAllUsers);
router.get('/stats', userController.getUserStats); // avant /:id
router.get('/:id', userController.getUserById);
router.patch('/:id/deverrouiller', userController.deverrouillerUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
