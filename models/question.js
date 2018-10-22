'use strict';

const mongoose = require ('mongoose');

const questionSchema = new mongoose.Schema ({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  memoryStrength: Number,
  next: Number
});

module.exports = mongoose.model('Question', questionSchema);