const express = require('express');
const router = express.Router();

const {
  getConfig,
  updateEmpresa,
  updateUsuarioMe,
  updateEmpresaLogo,
} = require('../controllers/configController');

const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', getConfig);
router.patch('/usuario', updateUsuarioMe);
router.patch('/empresa', authorizeRoles('admin', 'superadmin'), updateEmpresa);
router.patch('/empresa/logo', authorizeRoles('admin', 'superadmin'), updateEmpresaLogo);

module.exports = router;

