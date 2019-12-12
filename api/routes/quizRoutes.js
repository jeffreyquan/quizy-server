const quizBuilder = require('../controllers/quizController');
const express = require('express');
const router = express.Router();

// GET /quizzes
router.get('/', quizBuilder.listAllQuizzes);

// POST /quizzes
router.post('/', quizBuilder.createAQuiz);

// GET /quizzes/:quizId
router.get('/:quizId', quizBuilder.readAQuiz);

// POST /quizzes/:quizId
router.put('/:quizId', quizBuilder.updateAQuiz);

// DELETE /quizzes/:quizId
router.delete('/:quizId', quizBuilder.deleteAQuiz);

module.exports = router;
