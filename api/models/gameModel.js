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
  questionShow: {
    type: Boolean
  },
  questionCount: {
    type: Number
  }
}, { collection: 'game' });

module.exports = mongoose.model('Game', GameSchema);
