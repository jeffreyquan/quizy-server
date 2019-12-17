const mongoose = require('mongoose');
const { Schema } = mongoose;

const PlayerSchema = new Schema({
  hostId: {
    type: String,
  },
  pin: {
    type: Number
  },
  playerId: {
    type: String
  },
  nickname: {
    type: String
  },
  answer: {
    type: String
  },
  score: {
    type: Number
  },
  streak: {
    type: Number
  },
  lastCorrect: {
    type: Boolean
  }
}, { collection: 'player' });

module.exports = mongoose.model('Player', PlayerSchema);
