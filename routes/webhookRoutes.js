const express = require('express');
const router = express.Router();
const { wompiWebhookHandler } = require('../controllers/webhookController');

router.post('/wompi', wompiWebhookHandler);

module.exports = router;
