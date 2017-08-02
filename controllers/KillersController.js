// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      utils   = require('../utils'),
      logger  = require('winston'),
      Promise = require('bluebird'),
      moment  = require('moment');

const controller = {

  get_add: [utils.isAdmin, function(req, res) {
    let p = models.User.findAll({
      where: models.sequelize.where(models.sequelize.literal('games & 4'), '!=', 0),
      attributes: ['id', 'username']
    });
    let now = moment().format('YYYY-MM-DD');
    let w = models.Week.findAll({
      where: { status: 0, start: { $gte: now } },
      attributes: ['id', 'start'],
      order: [['id', 'ASC']],
      limit: 3
    })

    Promise.join(p, w, (players, weeks) => {
      //res.send(`<pre>${ JSON.stringify([players, week], null, 2) }</pre>`)
      weeks.map(wk => {
        wk.fstart = moment(wk.start).format('Do MMM');
      })
      res.render('killers/add', {
        title: 'New Killer game',
        players: players,
        weeks: weeks,
        edit: false
      })
    })
  }],

  post_add: [utils.isAdmin, function(req, res) {

    let admin = req.user ? req.user : {};
    models.Killer.create({
      start_week: req.body.week,
      description: req.body.desc,
      admin_id: admin.id
    }).then(game => {
      let kentries = [];
      for (let x = 0; x < req.body.players.length; x++) {
        kentries.push(models.Kentry.create({
          killer_id: game.id,
          week_id: req.body.week,
          round_id: 1,
          lives: 3,
          user_id: req.body.players[x]
        }).catch(e => { logger.error(e); }))
      }
      Promise.all(kentries).then(ret => {
        req.flash('success', `Game created. Go to <code>/killers/${ game.id }</code> to start making predictions`);
        logger.info(`Killer game ${ game.id } with ${ kentries.length } players created by ${ admin.username }`);
        res.redirect('/killers/');        
      })
    }).catch(e => {
      res.send(e);
    })
  }],

  get_edit_id: [utils.isAdmin, function(req, res, id) {
    
    let g = models.Killer.findAll({
      where: { id: id },
      attributes: ['id', 'description', 'start_week'],
      include: [{
        model: models.User,
        attributes: ['id', 'username']
      }, {
        model: Kentry,
        attributes: ['user_id']
      }, {
        model: Week,
        attributes: ['id', 'start', 'status']
      }]
    });
    let p = models.User.findAll({
      where: models.sequelize.where(models.sequelize.literal('games & 4'), '!=', 0),
      attributes: ['id', 'username']
    });
    let now = moment().format('YYYY-MM-DD');
    let w = models.Week.findAll({
      where: { status: 0, start: { $gte: now } },
      attributes: ['id', 'start'],
      order: [['id', 'ASC']],
      limit: 3
    })

    Promise.join(g, p, w, (game, players, weeks) => {

    })

  }],

  post_edit_id: [utils.isAdmin, function(req, res, id) {

  }],

  get_index: function(req, res) {
    let options = {
      order: [['start_week', 'DESC']],
      include: [{
        model: models.User,
        attributes: ['id', 'username']
      }]
    }

    let all = false;
    if (req.query.all === undefined) {
      options.limit = 5;
      all = true;
    }

    models.Killer.findAll(options).then(killers => {
      res.render('killers/index', {
        title: 'Killer games',
        games: killers,
        all: all
      })
    }).catch(e => {
      req.flash('error', 'Sorry, could not retrieve list of Killer games');
      logger.error(e);
      res.redirect('/');
    })
  },

  get_play_id: [utils.isAuthenticated, function(req, res, id) {
    // id is the id of the killer game
    let uid = req.user ? req.user.id : 0;

    let table = models.Killer.table(id, uid),
        entry = models.Killer.killerEntry(id, uid);

    Promise.join(table, entry, (killer, edit) => {
      //res.send(`<pre>${ JSON.stringify(killer, null, 2) }</pre>`)
      res.render('killers/play', {
        title: 'Killer game ' + killer.game.id,
        game: killer.game,
        rounds: killer.rounds,
        edit: edit
      })
    })

  }],

  post_play: [utils.isAuthenticated, function(req, res) {
    let usr = req.user ? req.user.id : req.body.uid;

    let errs = [];
    if (!usr || req.body.kid == '' || req.body.rid == '' || req.body.wid == '' || req.body.homeId == '' || req.body.awayId == '') {
      errs.push(`Can't process match, details incorrect`);
    } else {
      // search matches for team ids and week
      // otherwise create a new match
      // once we have a mid, crete or edit a kentry row
      let killerMatch = '';
      models.Match.findOne({
        where: { teama_id: req.body.homeId, teamb_id: req.body.awayId, week_id: req.body.wid } 
      }).then(match => {
        if (!match) {
          killerMatch = models.Match.create({
            week_id: req.body.wid,
            date: req.body.date,
            league_id: 0,
            teama_id: req.body.homeId,
            teamb_id: req.body.awayId,
            game: 4
          }).then(m => { logger.info(`Match ${ m.id } created`); })
        } else {
          killerMatch = match.update({

          }).then(upd => { logger.info(`Match ${ upd.id } updated`); })
        }
      })

      killerMatch.then(km => {

      })
    }


    //res.send(req.body);
  }],

  delete_id: [utils.isAdmin, function(req, res, id) {

  }]

}

module.exports = controller;