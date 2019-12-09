const mongoose = require('mongoose');
const { Schema } = mongoose;

const QuestionSchema = new Schema({
  body: {
    type: String,
    required: 'Question cannot be blank'
  },
  
})
