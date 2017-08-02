/******************************************************************************
project:  dicanio
file:     server.js

main entry point for app

******************************************************************************/

// jshint node: true, esversion: 6
'use strict';

const express         = require('express'),
      app             = express(),
      pkg             = require('./package.json'),
      bp              = require('body-parser'),
      expressSession  = require('express-session'),
      excon           = require('express-controller'),
      flash           = require('connect-flash'),
      logger          = require('./logs'),
      models          = require('./models'),
      moment          = require('moment'),
      bars            = require('express-handlebars');

const router          = express.Router();

// handlebars as templating engine
var hbs = bars.create({
  defaultLayout: 'layout',
  extname: '.hbs',
  helpers: {
    killerLives: (lives, lost) => {
      if ((lives - lost) <= 0) {
        return '<span>&#9760;</span>';
      } else {
        let heart = '<span>♥</span>';
        let lostheart = '<span class="lost">♥</span>'
        if (lost) {
          return heart.repeat(lives - 1) + lostheart;
        } else {
          return heart.repeat(lives);
        }
      }
    }
  }
});

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');

// set static route
app.use(express.static('assets'));

// body-parsing for post requests
app.use(bp.urlencoded({ 'extended': true }));
app.use(bp.json());

app.set('port', process.env.PORT || 2000);

// set up middleware
app.use(expressSession({
  secret: 'dfTJ2gIw6wfw',
  resave: false,
  saveUninitialized: false
}));
app.use(flash());
app.use((req, res, next) => {
  res.locals.flash_success = req.flash('success');
  res.locals.flash_error = req.flash('error');
  res.locals.flash_info = req.flash('info');
  res.locals.dev = process.env.NODE_ENV || 'dev';
  next();
});

// authentication using passport.js
require('./auth')(app);

// add routing
app.use(router);
require('./routes')(app);
excon.setDirectory(__dirname + '/controllers').bind(router);

app.use((req, res) => {
  res.status(400).render('errors/404', {
    title: 'Uh-oh!'
  });
});

app.locals.pkg = pkg;

//set up sequelize and start server listening
models.sequelize.sync().then( () => {
  console.log('Sequelize initialised at', moment().format('HH:mm:ss ddd'));
  const server = app.listen(app.get('port'), () => {
    console.log(pkg.name, 'running on port', server.address().port);
    module.exports = server;
  });
});