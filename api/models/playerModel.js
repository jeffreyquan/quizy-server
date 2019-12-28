const mongoose = require('mongoose');
const { Schema } = mongoose;

const PlayerSchema = new Schema({
  game: {
    type: Schema.Types.ObjectId, ref: 'Game'
  },
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
  rank: {
    type: Number
  },
  lastCorrect: {
    type: Boolean
  },
  totalCorrect: {
    type: Number
  }
}, { collection: 'player' });

module.exports = mongoose.model('Player', PlayerSchema);
