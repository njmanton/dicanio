// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      Promise = require('bluebird'),
      utils   = require('../utils'),
      logger  = require('winston'),
      moment  = require('moment');

const controller = {

  get_id_edit: [utils.isAuthenticated, function(req, res, id) {
    models.Week.findById(id).then(wk => {
      let week = id || wk.id;
      let uid = req.user ? req.user.id : null;
      let expired = (moment(wk.start) < moment()) || wk.status;
      if (expired) {
        req.flash('error', `The deadline has passed for week ${ id }, you can no longer edit bets`);
        res.redirect('/weeks/' + id);
      } else {
        models.Bet.getBets(week, uid).then(matches => {
          res.render('bets/edit', {
            title: 'Edit Bet',
            data: matches,
            expired: expired,
            week: week
          })
        }).catch(e => {
          logger.error(`There was a problem with 'getBets' for week ${ id }. This has been logged.`);
          res.redirect('/weeks/' + id);
        })     
      }

    })
  }],

  get_id: function(req, res, id) {
    
    if (!isNaN(id)) {

      let user    = req.user ? req.user : {},
          table   = models.Bet.table(id, user),
          week    = models.Week.findById(id),
          overall = models.Place.overall(null, id, true);

      Promise.join(week, table, overall, (wk, bets, overall) => {
        if (bets !== null) {
          let expired = (moment(wk.start) < moment()) || wk.status;
          res.render('bets/view', {
            title: 'Bets',
            week: id,
            players: bets.players,
            table: bets.table,
            standings: overall,
            expired: expired,
          })
        } else {
          res.status(404).render('errors/404');
        }
      })

    } else {
      res.status(404).render('errors/404');
    }

  },

  post_edit: [utils.isAuthenticated, function(req, res) {

    let usr = req.user ? req.user.id : 1; // for testing
    models.Bet.addEditBets(req.body.bets, req.body.week, usr).then(r => {
      req.flash('success', `You updated ${ r } bets`);
      res.redirect('/bets/' + req.body.week);
    })
  }]

}

module.exports = controller;