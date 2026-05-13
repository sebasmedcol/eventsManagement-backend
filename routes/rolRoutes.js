const express = require('express');
const router = express.Router();
const {
  getRoles,
  getRolById,
  createRol,
  updateRol,
  deleteRol,
} = require('../controllers/rolController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(protect);

router
  .route('/')
  .get(authorizeRoles('admin', 'superadmin'), getRoles)
  .post(authorizeRoles('admin', 'superadmin'), createRol);

router
  .route('/:id')
  .get(authorizeRoles('admin', 'superadmin'), getRolById)
  .put(authorizeRoles('admin', 'superadmin'), updateRol)
  .delete(authorizeRoles('admin', 'superadmin'), deleteRol);

module.exports = router;
