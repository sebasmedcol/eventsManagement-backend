const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const {
  requireBillingAdmin,
  getAcceptanceTokensHandler,
  checkoutHandler,
  payWith3DSHandler,
  getTransactionStatusHandler,
  checkoutPreviewHandler,
  createPaymentSourceHandler,
  getPaymentSourceStatusHandler,
  getPaymentHistoryHandler,
  cancelSubscriptionHandler,
  reactivateSubscriptionHandler,
} = require('../controllers/suscripcionController');

router.use(verifyToken);
router.use(requireBillingAdmin);

router.get('/acceptance-tokens', getAcceptanceTokensHandler);
router.get('/checkout-preview/:planId', checkoutPreviewHandler);
router.post('/checkout', checkoutHandler);
router.post('/pay-with-3ds', payWith3DSHandler);
router.get('/transactions/:id/status', getTransactionStatusHandler);
router.post('/payment-sources', createPaymentSourceHandler);
router.get('/payment-sources/:id/status', getPaymentSourceStatusHandler);

router.get('/payments', getPaymentHistoryHandler);
router.post('/cancel', cancelSubscriptionHandler);
router.post('/reactivate', reactivateSubscriptionHandler);

module.exports = router;
