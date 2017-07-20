// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      moment  = require('moment'),
      Promise = require('bluebird'),
      logger  = require('winston'),
      utils   = require('../utils');

const controller = {

  get_index: function(req, res) {

    models.League.findAll({
      attributes: ['id', 'name', 'country', 'sport', 'international']
    }).then( leagues => {
      if (req.query.json === undefined) {
        res.render('leagues/index', {
          title: 'All Leagues | Goalmine',
          leagues: leagues
        })        
      } else {
        res.send(leagues);
      }

    })
  },

  get_id: function(req, res, id) {

    let league = models.League.findById(id, { attributes: ['id', 'name', 'country'] }),
        matches = models.Match.findAll({
          where: { league_id: id },
          attributes: ['id', 'date', 'result', 'game', 'gotw'],
          include: [{
            model: models.Team,
            as: 'TeamA',
            attributes: ['id', 'name']
          }, {
            model: models.Team,
            as: 'TeamB',
            attributes: ['id', 'name']
          }]
        });

      Promise.join(league, matches ,(l, m) => {
        m.map(i => {
          i.fdate = moment(i.date).format('ddd DD MMM');
        })
        if (l) {
          res.render('leagues/view', {
            title: l.name,
            league: l,
            matches: m
          })
        } else {
          res.status(404).render('errors/404');
        }
      }) 
  },

  get_add: [utils.isAdmin, function(req, res) {
    res.render('leagues/add', {
      title: 'Add League'
    })
  }],

  post_add: [utils.isAdmin, function(req, res) {

    let league = req.body.league,
        usr = req.user ? req.user.username : '(unknown)',
        cty = req.body.country || null;

    models.League.create({ name: league, country: cty }).then(response => {
      req.flash('success', `League ${ league } (${ response.id }) has been added to the database`);
      logger.info(`${ league } added to list of leagues (${ usr })`);
      res.redirect(req.url);
    }).catch(e => {
      if (e) {
        console.log(e);
        if (e.name == 'SequelizeUniqueConstraintError') {
          req.flash('error', 'Sorry, league names must be unique. \'' + league + '\' already exists in the Goalmine database');
        } else {
          req.flash('error', 'Sorry, that league could not be saved in the Goalmine database');
        }
        logger.warn(`Couldn't add ${ league } to Leagues (${ usr })`);
        res.redirect(req.url);
      }
    })
  }],

  delete_id: [utils.isAdmin, function(req, res, id) {

    let usr = req.user ? req.user.username : '(unknown)';
    
    models.League.findById(id, {
      attributes: ['id', 'name'],
      include: {
        model: models.Match,
        attributes: ['id']
      }
    }).then(league => {
      if (league) {
        if (league.matches.length) {
          res.status(409).send({ deleted: false, msg: `Cannot delete ${ league.name } (league id ${ league.id }). There are associated matches` });
        } else {
          league.destroy().then(t => {
            logger.info(`${ league.name } (league id: ${ league.id }) deleted by ${ usr }`);
            res.status(200).send({ deleted: true, msg: `${ league.name } (league id: ${ league.id }) deleted.` })
          }).catch(e => {
            logger.error(`Error deleting league - ${ e }`);
            res.status(500).send({ deleted: false, msg: `Db error deleting ${ league.name } (league id: ${ league.id } - error: ${ e }`})
          })
        }
      } else {
        res.status(200).send({ deleted: false, msg: `League ${ id } not deleted. Doesn't exist.` });
      }
    })

  }],


  get_available_name: [utils.isAjax, function(req, res, name) {
    models.League.findOne({ where: { name: name } }).then(rows => {
      res.send(!rows);
    })
  }],

  get_find_name: [utils.isAjax, function(req, res, name) {
    models.League.findAll({ where: { name: { $like: `%${ name }%` } }, attributes: ['id', 'name'] }).then(rows => {
      res.send(rows);
    })
  }]

}

module.exports = controller;