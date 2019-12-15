const playerBuilder = require('../controllers/playerController');
const express = require('express');
const router = express.Router();

// GET /players
router.get('/', playerBuilder.listAllPlayers);

// POST /players
router.post('/', playerBuilder.createAPlayer);

// GET /players/:playerId
router.get('/:playerId', playerBuilder.readAPlayer);

// POST /players/:playerId
router.put('/:playerId', playerBuilder.updateAPlayer);

// DELETE /players/:playerId
router.delete('/:playerId', playerBuilder.deleteAPlayer);

module.exports = router;
