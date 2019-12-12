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

  newQuiz.save((err, quiz) => {
    if (err) res.send(err);
    res.json(quiz);
  });
};

exports.readAQuiz = (req, res) => {
  Quiz.findById(req.params.quizId, (err, quiz) => {
    if (err) res.send(err);
    res.json(quiz);
  });
};

exports.updateAQuiz = (req, res) => {
  Quiz.findOneAndUpdate(
    { _id: req.params.quizId },
    req.body,
    { new: true },
    (err, quiz) => {
      if (err) res.send(err);
      res.json(quiz);
    }
  );
};

exports.deleteAQuiz = (req, res) => {
  Quiz.deleteOne({ _id: req.params.quizId },
  err => {
    if (err) res.send(err);
    res.json({
      message: 'Quiz successfully deleted',
      _id: req.params.quizId
    });
  });
}
