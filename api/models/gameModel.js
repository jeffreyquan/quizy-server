const mongoose = require('mongoose');
const { Schema } = mongoose;

const GameSchema = new Schema({
  hostId: {
    type: String,
  },
  pin: {
    type: Number
  },
  quiz: {
    type: Schema.Types.ObjectId, ref: 'Quiz'
  },
  gameStatus: {
    type: Boolean
  },
  playersAnswered: {
    type: Number
  },
  questionNumber: {
    type: Number
  },
  questionStatus: {
    type: Boolean
  }
}, { collection: 'game' });

module.exports = mongoose.model('Game', GameSchema);
