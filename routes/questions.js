'use strict';
const express = require('express');
const mongoose = require ('mongoose');

const questions = require('../models/question');

const router = express.Router();

//Questions now live on user, should not need this at all

/* ========== GET/READ ALL QUESTIONS ========== */
router.get('/', (req, res, next) => {

  questions.find().select('question')
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  const { id } = req.params;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  questions.findById({ _id: id })
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;