'use strict';

const mongoose = require('mongoose');

const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
  },
  username: {
    type: String,
    required: true, 
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  questions: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      question: String,
      answer: String,
      memoryStrength: Number,
      next: Number
    }
  ],
  head: {
    type: Number,
    default: 0
  },
  allTimeAttempted: {
    type: Number,
    default: 0
  },
  allTimeCorrect: {
    type: Number,
    default: 0
  }
});

userSchema.set('toObject', {
  virtuals: true,
  transform: (doc, result) => {
    return {
      id: result.id,
      firstName: result.firstName,
      questions: result.questions,
      head: result.head,
      allTimeAttempted: result.allTimeAttempted,
      allTimeCorrect: result.allTimeCorrect
    };
  }
});

userSchema.methods.validatePassword = function(password) {
  const currentUser = this;
  return bcrypt.compare(password, currentUser.password);
};

userSchema.statics.hashPassword = function(password) {
  return bcrypt.hash(password, 10);
};

module.exports = mongoose.model('User', userSchema);