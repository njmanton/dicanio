// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      Promise = require('bluebird'),
      utils   = require('../utils'),
      marked  = require('marked'),
      emoji   = require('node-emoji'),
      mail      = require('../mail'),
      config  = require('../config'),
      logger  = require('winston'),
      moment  = require('moment');

const controller = {

  get_index: [utils.isAdmin, function(req, res) {
    let outstanding = models.Match.outstanding(),
        users = models.User.findAll({ attributes: ['id', 'username'] });

    Promise.join(outstanding, users, (outstanding, users) => {
      res.render('admin/index', {
        title: 'Admin Pages',
        user: req.user,
        matches: outstanding,
        users: users,
        header: 'header'
      })
    })

  }],

  post_match_update: [utils.isAdmin, function(req, res) {

    let result      = req.body.result,
        mid         = req.body.mid,
        tipoutcome  = null;
    // if the posted result isn't valid, return
    if (!utils.validScore(result)) { 
      res.send(false);
    } else {
      // get the tip outcome to update bets table
      let goals = result.split('-');

      if (goals[0] > goals[1]) {
        tipoutcome = '1';
      } else if (goals[0] < goals[1]) {
        tipoutcome = '2';
      } else {
        tipoutcome = 'X';
      }
      
      // update the match instance
      models.Match.update({
        result: result
      }, {
        where: { id: mid }
      }).then(row => {
        let usr = req.user ? req.user.username : '(unknown)';
        if (row) logger.info(`Match ${ mid } result set to: ${ result } by ${ usr }`);
        // then map across promises for each matching prediction/bet to update them
        let preds = models.Prediction.findAll({ 
              where: { match_id: mid },
              include: {
                model: models.Match,
                attributes: ['gotw']
              }
            }),
            tips = models.Bet.findAll({ 
              where: { match_id: mid },
              include: {
                model: models.Match,
                attributes: ['odds1', 'odds2', 'oddsX', 'result', 'gotw']
              }
            }),
            updates = { gm: 0, tp: 0, standings: 0 };

        let promisePreds = Promise.map(preds, pred => {
          let pts = utils.calc(pred.pred, result, pred.joker, pred.match.gotw);
          pred.update({
            points: pts
          })
          updates.gm++;
        })
        let promiseTips = Promise.map(tips, tip => {
          let outcome = (tip.prediction == tipoutcome) ? tip.amount * (tip.match['odds' + tipoutcome] - 1) : -tip.amount;
          tip.update({
            outcome: outcome
          })
          updates.tp++;
        })
        // then update the places and standings tables 
        let updStandings = models.Standing.updateTable(mid),
            updPlaces = models.Place.updateTable(mid),
            updKiller = ((row.game & 4) != 0) ? models.Killer.updateKiller(mid) : null;

        // join all promises together and resolve them
        Promise.join(promisePreds, promiseTips, updStandings, updPlaces, updKiller, (preds, tips, standings, places, killer) => {
          updates.standings = standings.length;
          updates.places = places.length;
          logger.info(`${ updates.gm } predictions/${ updates.tp } bets updated`);
          res.send(updates);
        })
      })      
    }
  }],

  post_ledger_add: [utils.isAdmin, function(req, res) {
    // data in form of { user: xxx, amount: xxx, desc: xxx }
    if (req.body.user && req.body.amount && req.body.desc) {
      models.Ledger.create({
        user_id: req.body.user,
        amount: req.body.amount,
        description: req.body.desc
      }).then(ledger => {
        res.send({ id: ledger.id });
        logger.info('Ledger id: ' + ledger.id + ' created');
      }).catch(e => {
        logger.error(e.name);
      })
    } else {
      res.send(false);
    }
  }],

  post_manage_users: [utils.isAdmin, function(req, res) {
    if (req.body.uid) {
      models.User.findById(req.body.uid).then(user => {
        if (user) {
          res.render('players/view', {
            title: 'User ' + user.username,
            player: user,
            admin: true
          })
        } else {
          req.flash('error', 'Sorry, no such user');
          res.redirect(req.url);
        }
      }).catch(e => {
        logger.error(e);
        console.log(e);
      })
    } else {
      req.flash('error', 'No such user');
      res.redirect(req.url);
    }
  }],

  post_sendmail: [utils.isAdmin, function(req, res) {

    let template = 'bulk_email.hbs',
        address = 'tipping-players@goalmine.eu',
        now = moment().format('YYYY-MM-DD'),
        context = {
          from: req.user ? req.user.username : 'Admin',
          body: marked(emoji.emojify(req.body.body)),
          date: now
        };

    mail.send(address, null, req.body.subject, template, context, mail_result => {
      console.log(mail_result);
    })

    req.flash('success', 'email sent');
    res.redirect('/');

  }],

  post_finalise: [utils.isAdmin, function(req, res) {
    let week = req.body.week;
    models.Week.finalise(week).then(response => {
      res.send(response);
    })
  }]

}

module.exports = controller;