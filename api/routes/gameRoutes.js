const gameBuilder = require('../controllers/gameController');
const express = require('express');
const router = express.Router();

// GET /games
router.get('/', gameBuilder.listAllGames);

// POST /games
router.post('/', gameBuilder.createAGame);

// GET /games/:gameId
router.get('/:gameId', gameBuilder.readAGame);

// POST /games/:gameId
router.put('/:gameId', gameBuilder.updateAGame);

// DELETE /games/:gameId
router.delete('/:gameId', gameBuilder.deleteAGame);

module.exports = router;
