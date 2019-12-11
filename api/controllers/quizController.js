const mongoose = require('mongoose');
const Quiz = mongoose.model('Quiz');

exports.listAllQuizzes = (req, res) => {
  Quiz.find({}, (err, quizzes) => {
    if (err) res.send(err);
    res.json(quizzes);
  })
};

exports.createAQuiz = (req, res) => {
  const newQuiz = new Quiz(req.body);

  newQuiz.save((err, word) => {
    if (err) res.send(err);
    res.json(quiz);
  });
};

exports.readAQuiz = (req, res) => {
  Quiz.findById(req.params.quizId, (err, word) => {
    if (err) res.send(err);
    res.json(quiz);
  });
};

exports.updateAQuiz = (req, res) => {
  Quiz.findOneAndUpdate(
    { _id: req.params.quizId },
    req.body,
    { new: true },
    (err, word) => {
      if (err) res.send(err);
      res.json(quiz);
    }
  );
};
