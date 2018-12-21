'use strict';
const express = require('express');
const mongoose = require ('mongoose');

const questions = require('../models/question');

const router = express.Router();

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
  // const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  questions.findById({ _id: id /*userId*/ })
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

/* ========== POST ANSWER TO SINGLE QUESTION ========== */
router.post('/:id', (req, res, next) => {
  const { id } = req.params;
  const { answer } = req.body;
  console.log('id:', id, 'answer:', answer); 

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  questions.findById({ _id: id })
    .then(result => {
      if (result) {
        console.log(result);
        if (answer === result.answer) {
          result.memoryStrength = result.memoryStrength * 2;         
        } else {
          result.memoryStrength = 1;
        }
        console.log(result);  //sends with memoryStrength doubled, not currently persisting/saving
        res.json(result);  //result is being sent back to postman
      } else {
        next();
      }
    })
    .catch(err => {
      console.log(err);
      next(err);
    });
});


module.exports = router;