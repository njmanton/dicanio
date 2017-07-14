// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      Promise = require('bluebird'),
      utils   = require('../utils'),
      moment  = require('moment');

const controller = {

  get_id_edit: [utils.isAuthenticated, function(req, res, id) {
    models.Week.current().then(wk => {
      let week = id || wk.id;
      let uid = req.user ? req.user.id : 1;
      models.Bet.getBets(week, uid).then(matches => {
        res.render('bets/edit', {
          title: 'Edit Bet',
          data: matches,
          expired: false,
          week: week
        })
      })  
    })
  }],

  get_id: function(req, res, id) {
    
    if (!isNaN(id)) {

      let user = req.user ? req.user : {};
      let table   = models.Bet.table(id, user),
          overall = models.Place.overall(null, id, true);

      Promise.join(table, overall, (bets, overall) => {
        if (bets !== null) {
          res.render('bets/view', {
            title: 'Bets',
            week: id,
            players: bets.players,
            table: bets.table,
            standings: overall,
            expired: false,
          })
        } else {
          res.sendStatus(404);
        }
      })

    } else {
      res.sendStatus(404);
    }

  },

  post_edit: [utils.isAuthenticated, function(req, res) {

    let usr = req.user ? req.user.id : 1; // for testing
    models.Bet.addEditBets(req.body.bets, req.body.week, usr).then(r => {
      req.flash('success', `You updated ${ r } bets`);
      res.redirect('/bets/' + req.body.week);
    })
    //res.send(`<pre>${ JSON.stringify(req.body, null, 2) }(</pre>`);
  }]

}

module.exports = controller;