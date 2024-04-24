// app.js
require('dotenv').config();

const express = require('express');
const app = express();
const connectDB = require('./server/config/db');
const PORT = process.env.PORT || 5000;
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const methodOverride = require('method-override')

connectDB();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(methodOverride('_method'))
app.use(cookieParser());
app.use(
  session({
    secret: 'sensei',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    },
  })
);

app.set('view engine', 'ejs');

// Router
app.use('/', require('./server/routes/main'));

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
