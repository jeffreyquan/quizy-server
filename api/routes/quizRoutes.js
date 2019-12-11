const quizBuilder = require('../controllers/quizController');

module.exports = app => {

  // GET /quizzes
  // POST /quizzes
  app
    .route('/quizzes')
    .get(quizBuilder.listAllQuizzes)
    .post(quizBuilder.createAQuiz);

  // GET /quizzes/:quizId
  // POST /quizzes/:quizId
  app
    .route('/quizzes/:quizId')
    .get(quizBuilder.readAQuiz)
    .put(quizBuilder.updateAQuiz);
}
