// jshint node: true, esversion: 6
'use strict';

const predictions = (sequelize, DataTypes) => {

  return sequelize.define('predictions', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    }, 
    match_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    pred: {
      type: DataTypes.STRING(5),
      allowNull: true
    },
    joker: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    classMethods: {
      table: (week, username) => {
        const models = require('.'),
              moment = require('moment'),
              utils  = require('../utils'),
              config = require('../config'),
              _      = require('lodash');

        return models.Match.findAll({
          where: sequelize.and(
            sequelize.where(sequelize.literal('game & 1'), '!=', 0),
            sequelize.where(sequelize.literal('week_id'), '=', week)
          ),
          order: [['date', 'ASC']],
          attributes: ['id', 'date', 'week_id', 'result', 'gotw'],
          include: [{
            model: models.Prediction,
            attributes: ['id', 'pred', 'joker', 'points', 'match_id'],
            include: {
              model: models.User,
              attributes: ['id', 'username']
            }
          }, {
            model: models.League,
            attributes: ['name', 'id', 'country']
          }, {
            model: models.Team,
            as: 'TeamA',
            attributes: ['name']
          }, {
            model: models.Team,
            as: 'TeamB',
            attributes: ['name']
          }]
        }).then(matches => {
          if (!matches.length) { return null };
          let table   = [],
              players = [];

          // build a list of all players for this week
          matches.forEach(match => {
            match.predictions.forEach(bet => {
              players.push({ user: bet.user.username, id: bet.user.id, total: 0, points: 0, closest: 0 });
            })
          })
          // if logged in user hasn't made any predictions yet, ensure they are included
          if (players.indexOf(username) == -1) {
            players.push({ user: username, total: 0, points: null, closest: 0 });
          }
          // strip out duplicates and sort to push logged in user to top of list
          players = _.uniqBy(players, 'user').sort((a, b) => { return a.user == username ? -1 : 1 });
          // iterate (again) to build the table array for rendering
          let totals = 0;
          matches.forEach(match => {

            let mid = match.id,
                row = {
                  header: {
                    id: mid,
                    sortdate: moment(match.date).format('YYYY-DD-MM'),
                    date: moment(match.date).format('ddd DD MMM'),
                    league: match.league.name,
                    lid: match.league.id,
                    country: match.league.country,
                    fixture: [match.TeamA.name, match.TeamB.name].join(' v '),
                    result: match.result,
                    gotw: match.gotw
                  },
                  preds: []
                };
                if (utils.validScore(match.result)) {
                  totals += match.result.split('-').reduce((a, b) => { return +a + +b; }, 0);
                }

            for (let x = 0; x < players.length; x++) {
              let scan = match.predictions.find(ele => {
                return ele.user.username == players[x].user;
              })
              if (scan === undefined) {
                row.preds.push(null);
              } else {
                row.preds.push(scan);
                players[x].total += scan.pred.split('-').reduce((a, b) => { return +a + +b; }, 0);
                players[x].points += +scan.points
              }
            }

            table.push(row);
          });

          // work out the player(s) who got closest to the total number of goals, and award  points
          let idx = 0, 
              prev = 1000,
              closest = 0;
          players.map(p => { 
            p.closest = Math.abs(totals - p.total);
            if (p.closest <= prev) { prev = p.closest; closest = p.closest }
          })
          players.map(p => {
            if (p.closest == closest) {
              p.closest = true;
              p.points += config.goalmine.pts_closest;
            } else {
              p.closest = false;
            }
          })

          table.sort((a, b) => {
            if (a.header.gotw == b.header.gotw) {
              if (a.header.sortdate == b.header.sortdate) {
                if (a.header.lid == b.header.lid) {
                  return (a.header.fixture < b.header.fixture) ? -1 : 1;
                } else {
                  return (a.header.lid < b.header.lid) ? -1 : 1;
                }
              } else {
                return (a.header.sortdate < b.header.sortdate) ? -1 : 1;
              }
            } else {
              return (a.header.gotw > b.header.gotw) ? -1 : 1;
            }
          })

          return { 
            table: table, 
            players: players, 
            totals: totals
          };

        })
      },

      getPlayers: week => {
        const models = require('.'),
              _      = require('lodash');
        return models.Prediction.findAll({
          raw: true,
          attributes: [],
          include: [{
            model: models.User,
            attributes: ['id'],
            required: true
          }, {
            model: models.Match,
            attributes: [],
            where: { week_id: week }
          }]
        }).then(players => {
          let ids = [];
          _.uniqBy(players, 'user.id').map(i => { ids.push(i['user.id'])});
          return ids;
        })
      },

      userPreds: id => {
        const models = require('.'),
              logger = require('winston'),
              config = require('../config');

        return models.Standing.findAll({
          where: { user_id: id, week_id: { $gte: config.goalmine.league_start } },
          attributes: ['week_id', 'points', 'position']
        }).then(preds => {
          return preds;
        }).catch(e => {
         logger.error(e) 
        })
      }

    }
  }, {
    tableName: 'predictions',
    freezeTableName: true
  })

}

module.exports = predictions;