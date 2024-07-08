const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const config = require('./config/config');
const routes = require('./routes/routes');
const { authenticateToken } = require('./middlewares/authMiddleware');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect(config.db.uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

app.use(authenticateToken); // place the auth middleware to secure the routes
app.use('/api', routes);
app.use(errorHandler); // Global error handler

app.listen(config.apiServerPort, () => {
  console.log(`API server running on port ${config.apiServerPort}`);
});