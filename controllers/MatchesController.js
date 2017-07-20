// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      utils   = require('../utils'),
      Promise = require('bluebird'),
      logger  = require('winston'),
      moment  = require('moment');

const processEditAdd = body => {
  let game = 0;
  if (body.goalmine == 'on') game++;
  if (body.tipping == 'on') game += 2;
  
  let save = {
    date: body.date,
    week_id: body.week,
    league_id: body.leagueId,
    teama_id: body.homeId,
    teamb_id: body.awayId,
    game: game,
    gotw: body.gotw == 'on',
    odds1: body.odds1,
    odds2: body.odds2,
    oddsX: body.oddsX,
  }

  return models.Match.findById(body.mid, { attributes: ['id'] }).then(match => {
    if (match) {
      return match.update(save);
    } else {
      return models.Match.create(save);
    }
  })

};

const controller = {

  get_index: function(req, res) {
    models.Match.findAll({
      where: [{ teama_id: { ne: null } }, { teamb_id: { ne: null } }],
      attributes: ['id', 'result', 'date'],
      include: [{
        model: models.Team,
        as: 'TeamA',
        attributes: ['id', 'name', 'sname']
      }, {
        model: models.Team,
        as: 'TeamB',
        attributes: ['id', 'name', 'sname']
      }, {
        model: models.League,
        attributes: ['id', 'name', 'country']
      }],
    }).then( matches => {
      matches.map(m => {
        m.fdate = moment(m.date).format('ddd MM YY');
      });
      res.render('matches/index', {
        title: 'All Matches | Goalmine',
        matches: matches
      })
    })
  },

  get_id: function(req, res, id) {
    models.Match.findOne({
      where: { id: id },
      attributes: ['id', 'week_id', 'date', 'odds1', 'odds2', 'oddsX', 'gotw', 'result'],
      include: [{
        model: models.Team,
        as: 'TeamA',
        attributes: ['id', 'name', 'sname']
      }, {
        model: models.Team,
        as: 'TeamB',
        attributes: ['id', 'name', 'sname']
      }, {
        model: models.League,
        attributes: ['id', 'name', 'country']
      }, {
        model: models.Bet,
        attributes: ['id', 'amount', 'prediction', 'outcome'],
        include: {
          model: models.User,
          attributes: ['id', 'username']
        }
      }, {
        model: models.Prediction,
        attributes: ['id', 'pred', 'joker', 'points'],
        include: {
          model: models.User,
          attributes: ['id', 'username']
        }        
      }],
    }).then(match => {
      match.fdate = moment(match.date).format('ddd DD MMM');
      if (match) {
        res.render('matches/view', {
          title: 'Match ' + match.id,
          data: match,
          result: match.result || 'v',
          editable: match.predictions.length == 0 && match.bets.length == 0
        })
      } else {
        res.status(404).render('errors/404');
      }

    })

  },

  delete_id: [utils.isAdmin, function(req, res, id) {
    let usr = req.user ? req.user.username : 'unknown';
    let bets = models.Bet.findAll({
      where: { match_id: id },
      attributes: ['id']
    }),
    preds = models.Prediction.findAll({
      where: { match_id: id },
      attributes: ['id']
    });

    Promise.join(bets, preds, (b, p) => {
      if (b.length || p.length) {
        logger.error(`tried to delete match: ${ id } but predictions/bets exist`);
        res.status(409).send({ deleted: false, msg: `Cannot delete Match ${ id }. There are associated bets/predictions.` });
      } else {
        models.Match.destroy({
          where: { id: id }
        }).then(m => {
          logger.info(`match: ${ id } deleted by (${ usr })`);
          res.status(200).send({ deleted: true, msg: `Match ${ id } deleted` });
        }).catch(e => {
          logger.error(`Couldn't delete match: ${ id }`);
          res.status(400).send({ deleted: false, msg: `Db error deleting match ${ id }` });
        })
      }
    })
  }],

  get_add_id: [utils.isAdmin, function(req, res, id) {
    // id is the week, not the match
    // get number of matches so far for that week
    models.Week.findById(id).then(wk => {
      if (wk == null) {
        req.flash('error', `That appears to be an invalid week (${ id })`);
        res.redirect('/');
      } else if (wk.status == 1) {
        req.flash('error', 'You cannot add matches to a week that has been completed');
        res.redirect('/weeks/' + id);
      } else {
        let dates = [];
        for (let x = 0; x < 7; x++) {
          dates.push({ 
            id: moment(wk.start).add(x, 'd').format('YYYY-MM-DD'), 
            date: moment(wk.start).add(x, 'd').format('dddd, D MMM')
          });
        }
        models.Match.findAll({
          where: { week_id: id },
          attributes: ['id', 'game', 'date'],
          include: [{
            model: models.Team,
            as: 'TeamA',
            attributes: ['id', 'name']
          }, {
            model: models.Team,
            as: 'TeamB',
            attributes: ['id', 'name']
          }, {
            model: models.League,
            attributes: ['id', 'name']
          }, {
            model: models.Bet,
            attributes: ['id']
          }, {
            model: models.Prediction,
            attributes: ['id']
          }]
        }).then(matches => {
          let gm = 0, tp = 0;
          matches.map(m => {
            m.fdate = moment(m.date).format('ddd DD MMM');
            if ((m.game & 2) != 0) {
              tp++;
            }
            if ((m.game & 1) != 0) {
              gm++;
            }
          })
          if (gm == 12) {
            req.flash('info', 'There are already 12 goalmine matches this week. You will need to delete one before adding a new match');
          }
          if (tp == 10) {
            req.flash('info', 'There are already 10 tipping matches this week. Are you sure you want to add another?');
          }
          res.render('matches/add', {
            title: 'add match',
            week: wk.id,
            matches: matches,
            dates: dates,
            goalmine: (gm == 12)
          })
        }).catch(e => { logger.error(e); })        
      }
    })

  }],

  get_edit_id: [utils.isAdmin, function(req, res, id) {
    // in this case, id is the match id, not week
    models.Match.findById(id, {
      attributes: ['id', 'date', 'week_id', 'odds1', 'odds2', 'oddsX', 'game'],
      include: [{
        model: models.Week,
        attributes: ['id', 'status', 'start']
      }, {
        model: models.Team,
        as: 'TeamA',
        attributes: ['id', 'name']
      }, {
        model: models.Team,
        as: 'TeamB',
        attributes: ['id', 'name']
      }, {
        model: models.League,
        attributes: ['id', 'name']          
      }]
    }).then(match => {
      if (!match) {
        req.flash('error', `Sorry, couldn't find that match`);
        res.redirect('/matches');
      } else {
        let wk = match.week,
            dates = [];

        for (let x = 0; x < 7; x++) {
          dates.push({ 
            id: moment(wk.start).add(x, 'd').format('YYYY-MM-DD'),
            date: moment(wk.start).add(x, 'd').format('dddd, D MMM')
          });
        };
        let gm = match.game;
        match.game = {};
        if ((gm & 1) != 0) {
          match.game.goalmine = true;
        }
        if ((gm & 2) != 0) {
          match.game.tipping = true;
        }
        models.Match.findAll({
          where: { week_id: wk.id },
          attributes: ['id', 'game', 'date'],
          include: [{
            model: models.Team,
            as: 'TeamA',
            attributes: ['id', 'name']
          }, {
            model: models.Team,
            as: 'TeamB',
            attributes: ['id', 'name']
          }, {
            model: models.League,
            attributes: ['id', 'name']
          }, {
            model: models.Bet,
            attributes: ['id']
          }, {
            model: models.Prediction,
            attributes: ['id']
          }]
        }).then(matches => {
          let gm = 0, tp = 0;
          matches.map(m => {
            m.fdate = moment(m.date).format('ddd DD MMM');
            if ((m.game & 2) != 0) {
              tp++;
            }
            if ((m.game & 1) != 0) {
              gm++;
            }
          })
          if (gm == 12) {
            req.flash('info', 'There are already 12 goalmine matches this week. You will need to delete one before adding a new match');
          }
          if (tp == 10) {
            req.flash('info', 'There are already 10 tipping matches this week. Are you sure you want to add another?');
          }
          res.render('matches/add', {
            title: 'edit match',
            week: wk.id,
            edit: match,
            matches: matches,
            dates: dates,
            goalmine: (gm == 12)
          })
        }).catch(e => { logger.error(e); console.log(e) })
      }
    })
  }],

  post_edit: [utils.isAdmin, function(req, res) {

    let redir = req.url + req.body.week;
    let usr = req.user ? req.user.username : '(unknown)';
    let err = '';
    if (req.body.homeId == '' || req.body.awayId == '' || req.body.leagueId == '' || req.body.week == '') {
      err = `Couldn't create that match`;
    }
    if (req.body.tipping == 'on' && (req.body.odds1 == '' || req.body.odds2 == '' || req.body.oddsX == '')) {
      err = 'Tipping matches must have all three odds';
    }
    if (!err) {
      let action = processEditAdd(req.body);
      action.then(result => {
        logger.info(`Match ${ result.id } edited by ${ usr }`);
        req.flash('success', 'Match edited!');
        res.redirect('/weeks/' + req.body.week);
      }).catch(e => {
        console.log(e);
        if (e.name == 'SequelizeUniqueConstraintError') {
          err = 'That match already exists for this week';
        } else {
          logger.error(e);
          err = 'Sorry, there was a database error saving that match';
        }
        req.flash('error', err);
        res.redirect('/weeks/' + req.body.week);
      })
    } else {
      req.flash('error', err);
      res.redirect(redir); 
    }

  }],

  post_add: [utils.isAdmin, function(req, res) {

    let redir = req.url + req.body.week;
    let usr = req.user ? req.user.username : '(unknown)';
    let err = '';
    if (req.body.homeId == '' || req.body.awayId == '' || req.body.leagueId == '' || req.body.week == '') {
      err = `Couldn't create that match`;
    }
    if (req.body.tipping == 'on' && (req.body.odds1 == '' || req.body.odds2 == '' || req.body.oddsX == '')) {
      err = 'Tipping matches must have all three odds';
    }
    if (!err) {
      let action = processEditAdd(req.body);
      action.then(result => {
        logger.info(`Match ${ result.id } created by ${ usr }`);
        req.flash('success', 'Match created!');
        res.redirect(redir);
      }).catch(e => {
        if (e.name == 'SequelizeUniqueConstraintError') {
          err = 'That match already exists for this week';
        } else {
          err = 'Sorry, there was a database error saving that match';
        }
        req.flash('error', err);
        res.redirect('/weeks/' + req.body.week);
      })
    } else {
      req.flash('error', err);
      res.redirect(redir); 
    }

  }],

  get_duplicate: [utils.isAdmin, utils.isAjax, function(req, res) {
    // check whether match is a duplicate, i.e. same teams and date
    // request = ta, tb, dt
    models.Match.findOne({
      attributes: ['id'],
      where: { teama_id: req.query.ta, teamb_id: req.query.tb, date: req.query.dt }
    }).then(match => {
      res.send(!!match);
    })
  }]
  
}

module.exports = controller;