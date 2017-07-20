// jshint node: true, esversion: 6
'use strict';

const debug   = require('../config'),
      models  = require('../models');

const points = {
  win: 5,
  correct_difference: 3,
  correct_result: 1,
  joker_penalty: 0
};

const sgn = a => {
  
  if (a < 0) {
    return -1;
  } else if (a > 0) {
    return 1;
  } else if (a === 0) {
    return 0;
  } else {
    return NaN;
  }

};

const validScore = score => {
  try {
    let goals = score.split('-');
    return !(isNaN(parseInt(goals[0])) || isNaN(parseInt(goals[1])));
  } catch(e) {
    return false;
  }  
};


const utils = {

  getTempName: len => {
    var code = '', 
      letters = '234679ACDEFGHJKLMNPQRTUVWXYZ'; 
  
    // generate a random code
    for (var i = 0; i < len; i++) {
      var idx = Math.floor(Math.random() * (letters.length - 1));
      code += letters[idx];
    }
    return code;
  },

  // access functions used in routes
  isAjax: (req, res, next) => {
    if (req.xhr || debug.cfg.allowCurlAjax) { //~req.headers.accept.indexOf('json') || debug.cfg.allowCurlAjax) {
      return next();
    } else {
      res.sendStatus(403);
    }
  },

  isAuthenticated: (req, res, next) => {
    if (req.isAuthenticated() || debug.cfg.allowCurlAuth) {
      models.Week.current().then(wk => {
        res.locals.curweek = wk.id;
        return next();
      })
    } else {
      req.session.returnTo = req.url;
      res.redirect('/login');      
    }

  },

  isAnon: (req, res, next) => {
    if (req.isAuthenticated() && !debug.cfg.allowCurlAnon) {
      res.redirect('/users/' + req.user.id);
    }
    return next();
  },

  isAdmin: (req, res, next) => {
    if ((req.isAuthenticated() && req.user.admin == 1) || debug.cfg.allowCurlAdmin) {
      models.Week.current().then(wk => {
        res.locals.curweek = wk.id;
        return next();
      })
    } else {
      if (req.isAuthenticated()) {
        req.flash('error', 'must be an admin');
        res.redirect('/home');
      }
      req.session.returnTo = req.url;
      res.redirect('/login');      
    }
  },

  validScore: score => {
    return validScore(score);
  },  

  calc: (pred, result, joker) => {
  
    let pg, rg, score = 0;
    if (validScore(result) && validScore(pred)) {
      rg = result.split('-');
      pg = pred.split('-');
    } else {
      return score;
    }

    if (pred == result) {
      score = points.win * (joker + 1);
    } else if ((pg[0] - rg[0]) == (pg[1] - rg[1])) {
      score = points.correct_difference * (joker + 1);
    } else if (sgn(pg[0] - pg[1]) == sgn(rg[0] - rg[1])) {
      score = points.correct_result * (joker + 1);
    } else {
      score = (joker * points.joker_penalty);
    }

    return score;

  }

};

module.exports = utils;