// jshint node: true, esversion: 6
'use strict';

const Promise = require('bluebird'),
      models  = require('../models');

const controller = {

  get_goalmine: function(req, res) {
    let uid = req.user ? req.user.id : null;
    models.Week.current().then(wk => {
      models.Standing.overall(uid, wk.id).then(standings => { 
        res.render('standings/view', {
          title: 'Standings',
          table: standings,
        })
      })      
    })

  }, 

  get_tipping: function(req, res) {
    let uid = req.user ? req.user.id : null;
    models.Week.current().then(wk => {
      models.Place.overall(uid, wk.id).then(standings => { 
        res.render('places/view', {
          title: 'Standings',
          table: standings
        })
      })      
    })

  },

  get_test_id: function(req, res, id) {
    models.Place.updateTable(id).then(r => {
      let rr = JSON.stringify(r, null, 2);
      res.send(`<pre>${rr}</pre>`);
    })
  },

  get_index: function(req, res) {
    let uid = req.user ? req.user.id : null;
    models.Week.current().then(wk => {
      Promise.join(models.Place.overall(uid, wk.id), models.Standing.overall(uid, wk.id), (tipping, goalmine) => {
        res.render('standings/index', {
          title: 'Standings at Week' + wk.id,
          tipping: tipping,
          goalmine: goalmine
        })
      })
    })
  }

}

module.exports = controller;