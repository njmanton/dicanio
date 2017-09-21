// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      utils   = require('../utils'),
      Promise = require('bluebird'),
      logger  = require('winston'),
      moment  = require('moment');

const controller = {

  get_index: function(req, res) {
    models.Team.findAll({
      attributes: ['id', 'name', 'country'],
      raw: true
    }).then( teams => {
      res.render('teams/index', {
        title: 'All Teams',
        teams: teams
      })
    });
  },

  get_id: function(req, res, id) {
    let team = models.Team.findById(id);
    let matches = models.Match.findAll({
      where: { $or: [{ teama_id: id }, { teamb_id: id }] },
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
      }]
    });
    Promise.join(team, matches, (team, matches) => {
      if (team) {
        let games = [];
        for (var x = 0; x < matches.length; x++) {
          let match = matches[x],
              result = null,
              home = (match.TeamA && match.TeamA.id == id);

          if (match.result) {
            result = (home) ? match.result : match.result.split('-').reverse().join('-');
          }

          let oppo = (home) ? { id: match.TeamB.id, name: match.TeamB.name } : { id: match.TeamA.id, name: match.TeamA.name };
          let league = (match.league) ? { id: match.league.id, name: match.league.name, country: match.league.country } : { id: null, name: null, country: null };
          games.push({
            id: match.id,
            date: moment(match.date).format('DD MMM YY'),
            opponent: oppo,
            result: result || '-',
            league: league
          })
        }
        if (req.query.json === undefined) {
          res.render('teams/view', {
            title: team.name,
            team: team,
            matches: games
          })          
        } else {
          res.send([team, games]);
        }

      } else {
        res.status(404).render('errors/404');
      }
    })
  },

  get_add: [utils.isAdmin, function(req, res) {
    res.render('teams/add', {
      title: 'Add Team'
    })
  }],

  post_add: [utils.isAdmin, function(req, res) {
    let team = req.body.team,
        usr = req.user ? req.user.username : '(unknown)',
        cty = req.body.country || null;

    models.Team.create({ name: team, country: cty }).then(response => {
      req.flash('success', `Team ${ team } (${ response.id }) has been created in the database`);
      logger.info(`${ team } added to list of teams by ${ usr }`)
      res.redirect(req.url);
    }).catch(e => {
      if (e) {
        if (e.name == 'SequelizeUniqueConstraintError') {
          req.flash('error', `Sorry, team names must be unique. '${ team }' already exists in the Goalmine database`);
        } else {
          req.flash('error', 'Sorry, that team could not be saved in the Goalmine database');
        }
        logger.error(`Couldn't add ${ team } to Teams - by ${ usr }`);
        console.log(e);
        res.redirect(req.url);
      }
    })
  }],

  delete_id: [utils.isAdmin, function(req, res, id) {

    let usr = req.user ? req.user.username : '(unknown)';

    models.Team.findById(id, { attributes: ['name', 'id'] }).then(team => {
      if (!team) {
        res.status(200).send({ deleted: false, msg: `Team ${ id } not deleted. Doesn't exist.` });
      } else {
        models.Match.findAll({
          where: { $or: [{ teama_id: team.id }, { teamb_id: team.id }] },
          attributes: ['id']
        }).then(matches => {
          if (matches.length) {
            res.status(409).send({ deleted: false, msg: `Cannot delete ${ team.name } (team id: ${ team.id }). There are associated matches` });
          } else {
            team.destroy().then(t => {
              logger.info(`${ team.name } (team id: ${ team.id }) deleted by ${ usr }`);
              res.status(200).send({ deleted: true, msg: `${ team.name } (team id: ${ team.id }) deleted` });
            }).catch(e => {
              logger.error(`Error deleting team - ${ e }`);
              res.status(500).send({ deleted: false, msg: `Db error deleting ${ team.name } - error: ${ e }` });
            })
          }
        })
      }
    })

  }],

  get_available_name: [utils.isAjax, function(req, res, name) {
    models.Team.findOne({ where: { name: name } }).then(rows => {
      res.send(!rows);
    })
  }],

  get_find_name: [utils.isAjax, function(req, res, name) {

    // if uid and kid are passed as parameters, find the used teams for that killer game
    models.Khistory.findAll({
      where: { user_id: req.query.uid, killer_id: req.query.kid },
      attributes: ['team_id']
    }).then(teams => {
      // create an array of used team ids 
      let ids = [];
      teams.map(t => {
        ids.push(t.team_id);
      })
      let where = {
          name: { $like: `%${ name }%` },
          englishleague: 1 
      }
      // only if there are used teams add the final where clause
      if (ids.length) where.id = { $notIn: ids };
      models.Team.findAll({
        where: where,
        attributes: ['id', 'name']
      }).then(teams => {
        res.send(teams);
      })
    })

  }]

}

module.exports = controller;

