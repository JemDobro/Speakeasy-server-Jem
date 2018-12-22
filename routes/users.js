'use strict';

const express = require('express');
const mongoose = require ('mongoose');
const passport = require('passport');

const User = require('../models/user');
const questions = require('../models/question');

const router = express.Router();

/* ===============USE PASSPORT AUTH JWT ============= */
router.use(
  '/:id', passport.authenticate('jwt', { session: false, failWithError: true })
);

/* =============== CREATE A USER =============== */
router.post('/', (req, res, next) => {

  /***** Never trust users - validate input *****/
  const requiredFields = ['firstName','username', 'password'];
  const missingField = requiredFields.find(field => !(field in req.body));

  if (missingField) {
    const err = new Error(`Missing '${missingField}' in request body`);
    err.status = 422;
    return next(err);
  }

  const stringFields = ['firstName', 'lastName', 'username', 'password'];
  const nonStringField = stringFields.find(
    field => field in req.body && typeof req.body[field] !== 'string'
  );

  if (nonStringField) {
    const err = new Error(`Field: '${nonStringField}' must be type String`);
    err.status = 422;
    return next(err);
  }

  const explicitlyTrimmedFields = ['username', 'password'];
  const nonTrimmedField = explicitlyTrimmedFields.find(
    field => req.body[field].trim() !== req.body[field]
  );

  if (nonTrimmedField) {
    const err = new Error(`Field: '${nonTrimmedField}' cannot start or end with whitespace`);
    err.status = 422;
    return next(err);
  }

  const sizedFields = {
    firstName: { min: 1 },
    username: { min: 3 },
    password: { min: 10, max: 72 }
  };

  const tooSmallField = Object.keys(sizedFields).find(
    field => 'min' in sizedFields[field] &&
            req.body[field].trim().length < sizedFields[field].min
  );
  if (tooSmallField) {
    const min = sizedFields[tooSmallField].min;
    const err = new Error(`Field: '${tooSmallField}' must be at least ${min} characters long`);
    err.status = 422;
    return next(err);
  }

  const tooLargeField = Object.keys(sizedFields).find(
    field => 'max' in sizedFields[field] &&
            req.body[field].trim().length > sizedFields[field].max
  );

  if (tooLargeField) {
    const max = sizedFields[tooLargeField].max;
    const err = new Error(`Field: '${tooLargeField}' must be at most ${max} characters long`);
    err.status = 422;
    return next(err);
  }

  // Username and password were validated as pre-trimmed

  let { username, password, firstName, lastName = '' } = req.body;
  firstName = firstName.trim();
  lastName = lastName.trim();

  return Promise.all([User.hashPassword(password), questions.find()])
    .then(([digest, results]) => {
      const newUser = {
        firstName,
        lastName,
        username,
        password: digest,
        questions: results,
      };
      return User.create(newUser);
    })
    .then(result => {
      let userStats = {
        firstName: result.firstName,
        allTimeAttempted: result.allTimeAttempted,
        allTimeCorrect: result.allTimeCorrect
      };
      console.log(userStats);
      return res.status(201).location(`/api/users/${result.id}`).json(userStats);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The username already exists');
        err.status = 400;
      }
      next(err);
    });
});


/* ========== GET/READ ALL QUESTIONS ========== */
router.get('/next', (req, res, next) => {
  const userId = req.user.id;
  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error('The `userId` is not valid');
    err.status = 400;
    return next(err);
  }
  User.findById(userId) 
    .then(result => {
      let question = result.questions[result.head].question;
      console.log(question);
      res.json(question);
    })
    .catch(err => {
      next(err);
    });
});


/* ========== POST ANSWER TO SINGLE QUESTION ========== */
router.post('/answer', (req, res, next) => {
  const userId = req.user.id;
  const { answer } = req.body;
  // console.log('userId:', userId, 'answer:', answer); 

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  User.findById(userId)
    .then(result => {
      if (result) {
        // console.log(result);
        let currHead = result.head; //save value of current head
        let currQuestion = result.questions[result.head]; //save node just answered
        console.log('early currQuestion:', currQuestion);
        result.head = currQuestion.next;  //changed value of head here to point to next question
        if (answer === currQuestion.answer) {
          currQuestion.memoryStrength = currQuestion.memoryStrength * 2; 
          result.allTimeCorrect = result.allTimeCorrect + 1;     
        } else {
          currQuestion.memoryStrength = 1;
        } //evaluated memoryStrength for new location
        let answeredQuestion = currQuestion;
        for (let i = 0; i < currQuestion.memoryStrength; i++) {
          if (answeredQuestion.next === null) {
            break;
          }
          let nextQuestionIndex = answeredQuestion.next;
          let nextQuestion = result.questions[nextQuestionIndex];
          answeredQuestion = nextQuestion;
          console.log(answeredQuestion);
        }
        currQuestion.next = answeredQuestion.next;
        answeredQuestion.next = currHead;
        console.log('currQuestion late:', currQuestion, 'pointing to currQuestion late:', answeredQuestion);

        result.allTimeAttempted = result.allTimeAttempted + 1;    
        // console.log(result);  //sends with memoryStrength doubled, not currently persisting/saving
        result.save();
        let userStats = {
          memoryStrength: currQuestion.memoryStrength,
          answer: currQuestion.answer,
          allTimeAttempted: result.allTimeAttempted,
          allTimeCorrect: result.allTimeCorrect
        };
        console.log(userStats);
        res.json(userStats);  //result is being sent back to postman
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