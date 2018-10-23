'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const passport = require('passport');

const { PORT, CLIENT_ORIGIN } = require('./config');
const { dbConnect } = require('./db-mongoose');
const localStrategy = require('./passport/local');
const jwtStrategy = require('./passport/jwt');

const questionsRouter = require('./routes/questions');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');

const app = express();

app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'common' : 'dev', {
    skip: (req, res) => process.env.NODE_ENV === 'test'
  })
);

app.use(bodyParser.json());

app.use(
  cors({
    origin: CLIENT_ORIGIN
  })
);

passport.use(localStrategy);
passport.use(jwtStrategy);

const localAuth = passport.authenticate('local', { session: false, failWithError: true }); 
const jwtAuth = passport.authenticate('jwt', { session: false, failWithError: true });  

app.use('/api/questions', jwtAuth, questionsRouter);
app.use('/api/users/', usersRouter);
app.use('/api/auth', authRouter);

function runServer(port = PORT) {
  const server = app
    .listen(port, () => {
      console.info(`App listening on port ${server.address().port}`);
    })
    .on('error', err => {
      console.error('Express failed to start');
      console.error(err);
    });
}

if (require.main === module) {
  dbConnect();
  console.log('dbConnect ran');
  runServer();
  console.log('runServer ran');
}

module.exports = { app };
