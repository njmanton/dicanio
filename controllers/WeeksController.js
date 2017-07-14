// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      Promise = require('bluebird'),
      config  = require('../config'),
      utils   = require('../utils'),
      moment  = require('moment');

const controller = {

  get_index: function(req, res) {
    
    models.Week.current().then(wk => {
      models.Week.findAll({
        attributes: ['id', 'start', 'status'],
        include: {
          model: models.Match,
          attributes: [[models.sequelize.fn('COUNT', models.sequelize.col('date')), 'count']]
        },
        group: ['id'],
        where: { $and: [{ id: { $gte: config.goalmine.start_week } }, { id: { $lte: 505 } }] },
        order: [['id', 'desc']],
        raw: true
      }).then(weeks => {
        weeks.map(week => {
          week.end = moment(week.start).add(6, 'days').format('ddd DD MMM');
          week.start = moment(week.start).format('ddd DD MMM');
          week.matches = week['matches.count'];
          if (week.status == 1) {
            week.label = 'Complete';
          } else if (week['matches.count'] == 0) {
            week.label = 'Not available';
          } else {
            week.label = 'Available';
          }
        })
        res.render('weeks/index', {
          title: 'Weeks',
          data: weeks
        })
      })
    }).catch(e => {
      logger.error(e);
      res.sendStatus(500).render('errors/500');
    })

  },

  get_id: function(req, res, id) {
    let week = models.Week.findById(id),
        matches = models.Match.findAll({
          where: { week_id: id },
          attributes: ['id', 'date', 'result', 'game'],
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

    Promise.join(week, matches, (week, matches) => {
      if (week) {
        matches.map(m => { 
          m.fdate = moment(m.date).format('ddd DD MMM');
          m.fixture = [m.TeamA.name, m.TeamB.name].join(' v ');
          m.goalmine = (m.game & 1) != 0;
          m.tipping = (m.game & 2) != 0;
          m.killer = (m.game & 4) != 0;
        });
        res.render('weeks/view', {
          title: 'Week' + week.id,
          week: week,
          matches: matches
        });
      } else {
        res.status(404).render('errors/404');        
      }

    });
  },

  get_current: function(req, res) {

    models.Week.current().then(wk => {
      res.send(wk);
    })

  },

}

module.exports = controller;