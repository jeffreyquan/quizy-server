const mongoose = require('mongoose');
const { Schema } = mongoose;

const QuizSchema = new Schema({
  name: {
    type: String,
    required: 'Quiz name cannot be blank'
  },
  category: {
    type: String,
    required: 'Category cannot be blank'
  },
  user: {
    type: Schema.Types.ObjectId, ref: 'User'
  },
  questions: [{
    body: String,
    answers: [{
      body: String,
    }],
    correct: Number
  }]
}, { collection: 'quiz' });

module.exports = mongoose.model('Quiz', QuizSchema);
