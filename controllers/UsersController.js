// jshint node: true, esversion: 6
'use strict';

const models    = require('../models'),
      mail      = require('../mail'),
      auth      = require('../auth'),
      bCrypt    = require('bcrypt-nodejs'),
      utils     = require('../utils'),
      logger    = require('winston'),
      moment    = require('moment');

const controller = {

  get_id: function(req, res, id) {
    let user = models.User.findById(id);
    let preds = models.Prediction.findAll({
      where: { user_id: id },
      attributes: ['id', 'pred']
    });
    models.sequelize.Promise.join(user, preds, (user, preds) => {
      if (user) {
        res.render('players/view', {
          title: user.username,
          player: user,
          preds: preds,
          admin: false
        })
      } else {
        res.status(404).render('errors/404');
      }
    })
  },

  get_update: [utils.isAuthenticated, function(req, res) {
    res.render('players/update', {
      title: 'Update details'
    });
  }],

  get_forgot: [utils.isAnon, function(req, res) {
    // requires anon user
    res.render('players/forgot');
  }],

  post_forgot: function(req, res) {
    // validate form fields
    // if username and email exist, reset password
    // post format { username: <username>, email: <email> }
    models.User.findOne({
      where: [{ username: req.body.username }, { email: req.body.email }]
    }).then(user => {
      if (user) {
        logger.info(`${ user.username } made a password reset request`);
        var reset = utils.getTempName(10),
            now = moment().format('ddd DD MMM, HH:mm');
        user.resetpwd = reset;
        user.save().then(() => {
          var template = 'reset_request.hbs',
              cc = 'reset_password@goalmine.eu',
              subject = 'Password reset request',
              context = {
                name: req.body.username,
                reset: reset,
                date: now
              };

          mail.send(req.body.email, cc, subject, template, context, mail_result => {
            console.log(mail_result);
          })
        }).catch(e => {
          console.log('error', e);
          logger.error(e.name);
        });
      } else {
        logger.warn(`Password reset request failed for (${ req.body.username }, ${ req.body.email }) - no such user`);
      }
      req.flash('info', 'Thank you. If those details were found, you will shortly receive an email explaining how to reset your password');
      res.redirect('/');
    });
    
  },

  get_reset_id: function(req, res, id) {
    models.User.findOne({
      where: { resetpwd: id },
      attributes: ['username', 'email']
    }).then(user => {
      if (!user) {
        req.flash('error', 'Sorry, that code wasn\'t recognised. Please try again');
        res.redirect('/');
      } else {
        res.render('players/reset', {
          title: 'Reset Password',
          username: user.username
        });
      }
    })
  },

  post_reset_id: function(req, res, id) {
    models.User.findOne({
      where: { resetpwd: id, email: req.body.email }
    }).then(user => {
      // check there's a user with that reset code and email, and don't rely on
      // javascript to enforce password complexity
      if (user && (req.body.pwd.length > 7) && (req.body.pwd == req.body.rpt)) {
        user.update({
          password: bCrypt.hashSync(req.body.rpt, bCrypt.genSaltSync(10), null),
          resetpwd: null
        }).then(row => {
          if (row) {
            logger.info(`${ user.username } successfully reset their password`);
            req.flash('success', 'Your password has been updated. You can now log in');
          } else {
            req.flash('error', 'Sorry, unable to update that account');            
          }
          res.redirect('/');
        })        
      } else {
        req.flash('error', 'Sorry, those details were not valid');
        res.redirect('/');
      }
    })
    
  },

  get_id_tipchart: function(req, res, id) {
    models.Bet.userBets(id).then(bets => {
      res.send(`<pre>${ JSON.stringify(bets, null, 2) }</pre>`);
    })
  },

  get_id_gmchart: function(req, res, id) {
    models.Prediction.userPreds(id).then(preds => {
      res.send(preds);
    })
  }

}

module.exports = controller;