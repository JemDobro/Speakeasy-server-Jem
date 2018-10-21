'use strict';

const mongoose = require('mongoose');
require('mongoose-type-email');

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
    type: mongoose.SchemaTypes.Email,
    required: true, 
    unique: true
  },
  password: {
    type: String,
    required: true
  }
});

userSchema.set('toObject', {
  virtuals: true,
  transform: (doc, result) => {
    delete result._id;
    delete result.__v;
    delete result.password;
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