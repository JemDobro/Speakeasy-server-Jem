'use strict';

const mongoose = require('mongoose');

const bcrypt = require('bcryptjs');

const userShema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
  },
  username: {
    type: String,
    required: true
  }
})