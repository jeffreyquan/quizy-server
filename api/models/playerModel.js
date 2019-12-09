const mongoose = require('mongoose');
const { Schema } = mongoose;

const PlayerSchema = new Schema({
  nickname: {
    type: String,
    required: 'Nickname cannot be blank'
  },
  score: {
    type: Number
  },
  
})
