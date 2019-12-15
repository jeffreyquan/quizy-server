const mongoose = require('mongoose');
const Game = mongoose.model('Game');

exports.listAllGames = (req, res) => {
  Game.find({}, (err, games) => {
    if (err) res.send(err);
    res.json(games);
  })
};

exports.createAGame = (req, res) => {
  const newGame = new Game(req.body);

  newGame.save((err, game) => {
    if (err) res.send(err);
    res.json(game);
  });
};

exports.readAGame = (req, res) => {
  Game.findById(req.params.gameId, (err, game) => {
    if (err) res.send(err);
    res.json(game);
  });
};

exports.updateAGame = (req, res) => {
  Game.findOneAndUpdate(
    { _id: req.params.gameId },
    req.body,
    { new: true },
    (err, game) => {
      if (err) res.send(err);
      res.json(game);
    }
  );
};

exports.deleteAGame = (req, res) => {
  Game.deleteOne({ _id: req.params.gameId },
  err => {
    if (err) res.send(err);
    res.json({
      message: 'Game successfully deleted',
      _id: req.params.gameId
    });
  });
}
