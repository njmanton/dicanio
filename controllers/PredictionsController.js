// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      utils   = require('../utils'),
      Promise = require('bluebird'),
      moment  = require('moment');

const controller = {

  get_id: [utils.isAuthenticated, function(req, res, id) {
    
    let user = req.user ? req.user : {};
    let table   = models.Prediction.table(id, user.username),
        overall = models.Standing.overall(null, id, true),
        week    = models.Week.findById(id);

    Promise.join(table, overall, week, (t, o, w) => {

      let expired = (moment(w.start) < moment()) || w.status;
      if (t !== null) {
        res.render('predictions/view', {
          title: 'Predictions',
          week: id,
          players: t.players,
          table: t.table,
          totals: t.totals,
          standings: o,
          expired: expired
        })
      } else {
        res.status(404).render('errors/404');
      }
    })

  }],

  post_update: [utils.isAuthenticated, function(req, res) {

    if (req.body.pred.length && req.body.uid.length && req.body.mid.length && utils.validScore(req.body.pred)) {

      let save = {
        match_id: req.body.mid,
        user_id: req.body.uid,
        pred: req.body.pred
      }
      models.Prediction.findById(req.body.pid).then(prediction => {
        if (prediction) {
          prediction.update(save).then(r => {
            res.status(200).send({ id: r.id });
          });
        } else {
          models.Prediction.create(save).then(r => {
            res.status(200).send({ id: r.id });
          })
        }
      })
    } else {
      console.log('error');
      let errs = [];
      if (!req.body.pred) errs.push('prediction');
      if (!req.body.uid) errs.push('user');
      if (!req.body.mid) errs.push('match');
      res.status(400).send({ msg: 'missing parameters', params: errs });
    }
  }],

  post_joker: [utils.isAuthenticated, function(req, res) {
    // { uid: xxxxx, week: xxx, mid: xxxx }
    if (req.body.uid != '' && req.body.week != '' && req.body.mid != '') {
      // find prediction for user for that week and game with joker set
      // set it to 0, then set the new joker
      models.Prediction.findOne({
        attributes: ['id', 'joker'],
        where: { user_id: req.body.uid, joker: 1 },
        include: {
          model: models.Match,
          attributes: ['week_id'],
          where: { week_id: req.body.week }
        }
      }).then(old => {
        if (old) {
          old.update({ joker: 0 });
        }
        models.Prediction.update({ 
          joker: 1 
        }, {
          where: { match_id: req.body.mid, user_id: req.body.uid }
        }).then(upd => {
          res.send(upd);
        })

      })
    } else {
      res.sendStatus(400);
    }
  }]

}

module.exports = controller;