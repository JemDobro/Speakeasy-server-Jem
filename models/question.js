'use strict';

const mongoose = require ('mongoose');

const questionSchema = new mongoose.Schema ({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  memoryStrength: Number,
  next: Number
});

questionSchema.set('toObject', {
  virtuals: true,
  transform: (doc, result) => {
    delete result._id;
    delete result.next;
  }
});

module.exports = mongoose.model('Question', questionSchema);