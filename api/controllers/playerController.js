const mongoose = require('mongoose');
const Player = mongoose.model('Player');

exports.listAllPlayers = (req, res) => {
  Player.find({}, (err, players) => {
    if (err) res.send(err);
    res.json(players);
  })
};

exports.createAPlayer = (req, res) => {
  const newPlayer = new Player(req.body);

  newPlayer.save((err, player) => {
    if (err) res.send(err);
    res.json(player);
  });
};

exports.readAPlayer = (req, res) => {
  Player.findById(req.params.playerId, (err, player) => {
    if (err) res.send(err);
    res.json(player);
  });
};

exports.updateAPlayer = (req, res) => {
  Player.findOneAndUpdate(
    { _id: req.params.playerId },
    req.body,
    { new: true },
    (err, player) => {
      if (err) res.send(err);
      res.json(player);
    }
  );
};

exports.deleteAPlayer = (req, res) => {
  Player.deleteOne({ _id: req.params.playerId },
  err => {
    if (err) res.send(err);
    res.json({
      message: 'Player successfully deleted',
      _id: req.params.playerId
    });
  });
}
