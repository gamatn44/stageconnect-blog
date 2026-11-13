const createError = require('http-errors');
const express = require('express');
const logger = require('morgan');
const http = require('http');
const mongoose = require('mongoose');

const dbconnection = require('./config/dbconnection.json');

mongoose
  .connect(dbconnection.url)
  .then(() => console.log('database connected!'))
  .catch((err) => console.log(err));

const apiRouter = require('./routes/api');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404, 'Route introuvable'));
});

// error handler (JSON)
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message,
    data: null,
    ...(req.app.get('env') === 'development' && { stack: err.stack }),
  });
});

const port = process.env.PORT || 3000;
const server = http.createServer(app);

server.listen(port, () => console.log(`server is running on port ${port}`));

module.exports = app;
