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
      let userfirstName = {
        firstName: result.firstName
      };
      return res.status(201).location(`/api/users/${result.id}`).json(userfirstName);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The username already exists');
        err.status = 400;
      }
      next(err);
    });
});


/* ========== GET/READ ALL QUESTIONS, RETURN QUESTION AT HEAD ========== */
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


  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  User.findById(userId)
    .then(result => {
      if (result) {
        let currHead = result.head; //save value of current head, then can change result.head to point to next question
        let currQuestion = result.questions[result.head]; //save node(full question) just answered
        result.head = currQuestion.next;  //changed value of head here to point to next question so that will be the next question retrieved when ready to show the next question to the client side
        if (answer.toUpperCase() === currQuestion.answer.toUpperCase()) {
          currQuestion.memoryStrength = currQuestion.memoryStrength * 2; 
          result.allTimeCorrect = result.allTimeCorrect + 1;     
        } else {
          currQuestion.memoryStrength = 1;
        } //evaluated memoryStrength for new location
        if (currQuestion.memoryStrength > result.questions.length) { //this is here so we won't have to go through loop at all if not needed.  Once it is longer than the length of the array, it will go immediately to the end.
          let lastQuestion = result.questions.filter(question => question.next === null); //find last question in linkedlist
          lastQuestion[0].next = currHead; //point lastQuestion to currQuestion
          currQuestion.next = null; //point currQuestion to null, putting it at end of list
        } else {
          let answeredQuestion = currQuestion; //like creating a copy of current question in a variable called answeredQuestion so answeredQuestion can change without changing currQuestion. currQuestion.next will change at very end
          for (let i = 0; i < currQuestion.memoryStrength; i++) {//keep looping through one by one until the number of times of memoryStrength
            if (answeredQuestion.next === null) {     
              break;
            }
            let nextQuestionIndex = answeredQuestion.next; //gets index of nextQuestion every time answeredQuestion advances one
            let nextQuestion = result.questions[nextQuestionIndex]; //gets the nextQuestion
            answeredQuestion = nextQuestion; //sets answeredQuestion to equal nextQuestion...advances our loop by one, then loops again until we either get to the end, or we have looped the number of times of the memoryStrength value.  Once that happens, answeredQuestion is the question we need to put currQuestion after.
          }
          currQuestion.next = answeredQuestion.next;  //sets currQuestion.next to point where answeredQuestion.next is pointing, whether it is null, or points to another question...this slides currQuestion into that spot
          answeredQuestion.next = currHead; //points answeredQuestion.next to the index of our currQuestion
        }

        result.allTimeAttempted = result.allTimeAttempted + 1;    
        result.save();
        let answerResult = {
          firstName: result.firstName,
          memoryStrength: currQuestion.memoryStrength,
          answer: currQuestion.answer
        };
        res.json(answerResult);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET CURRENT USER ALL TIME STATS ========== */
router.get('/stats', (req, res, next) => {
  const userId = req.user.id;
  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error('The `userId` is not valid');
    err.status = 400;
    return next(err);
  }
  User.findById(userId) 
    .then(result => {
      let userAllTimeStats = {
        firstName: result.firstName,
        allTimeAttempted: result.allTimeAttempted,
        allTimeCorrect: result.allTimeCorrect
      };
      res.json(userAllTimeStats);
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;