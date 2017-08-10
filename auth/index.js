// jshint node: true, esversion: 6
'use strict';

var models              = require('../models'),
    bCrypt              = require('bcrypt-nodejs'),
    chalk               = require('chalk'),
    passport            = require('passport'),
    logger              = require('winston'),
    config              = require('../config'),
    moment              = require('moment'),
    LocalStrategy       = require('passport-local').Strategy,
    FacebookStrategy    = require('passport-facebook').Strategy,
    GoogleStrategy      = require('passport-google-oauth').OAuth2Strategy;

module.exports.createHash = password => {
  return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};

module.exports = app => {

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use('local', new LocalStrategy({ passReqToCallback: true },
    (req, username, password, done) => {
      models.User.findOne({
        where: { username: username }
      }).then(user => {
        if (!user) {
          logger.error(`Unknown user '${ username }' attempted login`);
          return done(null, false, { message: 'user not found' });
        }
        try {
          if (!bCrypt.compareSync(password, user.password)) {
            logger.info(`Incorrect password for ${ user.username }`);
            return done(null, false, { message: 'incorrect password' });
          }
        } catch(e) {
          console.log(e);
          return done(null, false, { message: 'problem entering password' });
        }
        let now = moment().format('YYYY-MM-DD HH:mm:ss');
        user.update({ resetpwd: null, lastlogin: now }); // nullify reset code, if present
        req.flash('success', 'logged in');
        logger.info(`${ user.username } logged in`);
        return done(null, user);

      }).catch(err => {
        logger.info('Error finding user');
        return done(err);
      });
    }
  ));

  passport.use(new FacebookStrategy({
    clientID          : process.env.FB_APP_ID || null,
    clientSecret      : process.env.FB_SECRET || null,
    callbackURL       : config.callbacks.FB,
    passReqToCallback : true
  },
    (req, token, refreshToken, profile, done) => {
      process.nextTick(() => {
        if (req.user) {
          models.User.update({
            facebook_id: profile.id
          }, {
            where: { id: req.user.id }
          }).then(u => {
            if (u) {
              req.flash('info', 'Account now linked to your Facebook profile');
              logger.info(`${ u.username } linked their Facebook account`);
              return done(null, req.user);
            } else {
              req.flash('error', 'Couldn\'t link your profile');
              return done(null, req.user);
            }
          }).catch(e => {
            logger.error(e);
            return done(e);
          });
        } else {
          // find the user in the database based on their facebook id
          models.User.findOne({
            where: { 'facebook_id': profile.id }
          }).then(user => {
            if (user) {
              req.flash('success', 'Logged in via Facebook');
              logger.info(`(FB) ${ user.username } logged in`);
              user.update({ resetpwd: null });
              return done(null, user);
            } else {
              req.flash('error', 'Can\'t find matching FB user');
              return done(null, false, { message: 'Can\'t find matching FB user. Have you linked your account?' });
            }
          }).catch(e => {
            return done(e);
          });          
        }

      });
    }
  ));

  passport.use(new GoogleStrategy({
    clientID          : process.env.G_APP_ID || null,
    clientSecret      : process.env.G_SECRET || null,
    callbackURL       : config.callbacks.GG,
    passReqToCallback : true
  },
    (req, token, refreshToken, profile, done) => {
      process.nextTick(() => {
        if (req.user) {
          models.User.update({
            google_id: profile.id
          }, {
            where: { id: req.user.id }
          }).then(u => {
            if (u) {
              req.flash('info', 'Account now linked to your Google+ profile');
              logger.info(`${ u.username } linked their Google account`);
              return done(null, req.user);
            } else {
              req.flash('error', 'Couldn\'t link your profile');
              return done(null, req.user);
            }
          }).catch(e => {
            return done(e);
          });
        } else {
          // find the user in the database based on their google id
          models.User.findOne({
            where: { 'google_id': profile.id }
          }).then(user => {
            if (user) {
              user.update({ resetpwd: null });
              req.flash('success', 'Logged in via Google');
              logger.info(`(Google) ${ user.username } logged in`);
              return done(null, user);
            } else {
              return done(null, false, { message: 'Can\'t find matching Google+ user. Have you linked your account?' });
            }
          }).catch(e => {
            return done(e);
          });          
        }

      });
    }
  ));


  // make user object available in handlebars views
  app.use((req, res, next) => {
    if (!res.locals.user && req.user) {
      res.locals.user = req.user;
    }
    next();
  });

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    models.User.findById(id).then(user => {
      done(null, user);
    });
  });

};

