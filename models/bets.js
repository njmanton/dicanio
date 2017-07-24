// jshint node: true, esversion: 6
'use strict';

const bets = (sequelize, DataTypes) => {

  return sequelize.define('bets', {
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
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    prediction: {
      type: DataTypes.ENUM,
      values: ['1','2','X'],
      allowNull: false
    },
    outcome: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    }
  }, {
    classMethods: {
      // create the grid for the given week
      table: (week, user) => {
        const models = require('.'),
              moment = require('moment'),
              _      = require('lodash'),
              utils  = require('../utils');

        return models.Match.findAll({
          where: sequelize.and(
            sequelize.where(sequelize.literal('game & 2'), '!=', 0),
            sequelize.where(sequelize.literal('week_id'), '=', week)
          ),
          order: [['date', 'ASC']],
          attributes: ['id', 'date', 'week_id', 'odds1', 'odds2', 'oddsX', 'result'],
          include: [{
            model: models.Bet,
            attributes: ['amount', 'prediction', 'outcome'],
            include: {
              model: models.User,
              attributes: ['id', 'username']
            }
          }, {
            model: models.Team,
            as: 'TeamA',
            attributes: ['name', 'sname']
          }, {
            model: models.Team,
            as: 'TeamB',
            attributes: ['name', 'sname']
          }]
        }).then(matches => {
          if (!matches.length) { return null };
          let table   = [],
              players = [];

          // build a list of all players for this week
          matches.forEach(match => {
            match.bets.forEach(bet => {
              players.push({ username: bet.user.username, id: bet.user.id });
            })
          })
          // strip out duplicates and sort to push logged in user to top of list
          let loggedIn = user ? user.username : null;
          players = _.uniqBy(players, 'id').sort((a, b) => a.username == loggedIn ? -1 : 1 );
          // iterate (again) to build the table array for rendering
          matches.forEach(match => {
            let result = null,
                winner = '-';
            if (utils.validScore(match.result)) {
              const goals = match.result.split('-');
              if (goals[0] > goals[1]) {
                result = '1'; winner = (match.TeamA.sname || match.TeamA.name);
              } else if (goals[0] < goals[1]) {
                result = '2'; winner = (match.TeamB.sname || match.TeamB.name);
              } else {
                result = 'X'; winner = 'Draw';
              }
            }

            let mid = match.id,
                row = {
                  header: {
                    id: mid,
                    date: moment(match.date).format('ddd DD MMM'),
                    fixture: [(match.TeamA.sname || match.TeamA.name), (match.TeamB.sname || match.TeamB.name)].join(' v '),
                    result: winner,
                    return: match.result ? match['odds' + result] : '-'
                  },
                  bets: []
                };

            for (let x = 0; x < players.length; x++) {
              let scan = match.bets.find(ele => {
                return ele.user.username == players[x].username;
              })
              if (scan === undefined) {
                row.bets.push(null);
              } else {
                if (scan.prediction == '1') {
                  scan.prediction = (match.TeamA.sname || match.TeamA.name);
                } else if (scan.prediction == '2') {
                  scan.prediction = (match.TeamB.sname || match.TeamB.name);
                } else {
                  scan.prediction = 'Draw';
                }
                scan.win = (scan.outcome > 0);
                row.bets.push(scan);
              }
            }
            table.push(row);
          })
          return { table: table, players: players };
        })
      },

      getBets: (week, uid) => {
        // get all bets for a given week's games
        const models = require('.'),
              moment = require('moment');

        return models.Match.findAll({
          where: sequelize.and(
            sequelize.where(sequelize.literal('game & 2'), '!=', 0),
            sequelize.where(sequelize.literal('week_id'), '=', week)
          ),
          attributes: ['id', 'date', 'result', 'odds1', 'odds2', 'oddsX'],
          include: [{
            required: false,
            model: models.Bet,
            attributes: ['id', 'amount', 'prediction'],
            where: { user_id: uid }
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
          matches.map(match => { 
            match.fdate = moment(match.date).format('ddd DD MMM');
            match.bets = match.bets[0];
            match.odds1 = match.odds1 ? match.odds1.toFixed(2) : 0;
            match.odds2 = match.odds2 ? match.odds2.toFixed(2) : 0;
            match.oddsX = match.oddsX ? match.oddsX.toFixed(2) : 0;
            if (match.bets) {
              match.prediction = {
                odds1: match.bets.prediction == '1',
                odds2: match.bets.prediction == '2',
                oddsX: match.bets.prediction == 'X'
              }
            } else {
              match.prediction = {}
            }
          });
          return matches;
        })
        
      },

      places: week => {
        const models = require('.'),
              logger = require('winston');

        return models.Bet.findAll({
          attributes: ['user_id', 'match_id', 'amount', 'prediction', 'odds1', 'odds2', 'oddsX'],
          include: {
            model: models.Match,
            attributes: ['week_id'],
            where: { week_id: week }
          }
        })
      },

      userBets: id => {
        const models = require('.'),
              config = require('../config'),
              logger = require('winston');

        return models.Bet.findAll({
          where: { user_id: id },
          attributes: ['outcome'],
          include: [{
            model: models.Match,
            include: [{
              model: models.Team,
              as: 'TeamA',
              attributes: ['name']
            }, {
              model: models.Team,
              as: 'TeamB',
              attributes: ['name']
            }],
            attributes: ['date', 'week_id'],
            where: { week_id: { $gte: config.goalmine.league_start } },
            order: [['date', 'asc']]
          }]
        }).then(results => {
          let bets = [];
          results.map(item => {
            bets.push({
              week: item.match.week_id,
              fixture: `${ item.match.TeamA.name } v ${ item.match.TeamB.name }`,
              outcome: item.outcome,
              rolling: 0
            })
          })
          let prev = 0;
          bets.map(b => { 
            b.rolling = (prev + b.outcome);
            prev = b.rolling;
          })
          return bets;
        }).catch(e => {
          logger.error(e);
          return false;
        })

      },

      addEditBets: (data, wid, uid) => {

        const models = require('.'),
              Promise = require('bluebird'),
              logger = require('winston');

        let promises = [];
          
        for (var item in data) {
          let bet = data[item];
          let obj = {
            user_id: uid,
            match_id: bet.mid,
            prediction: bet.prediction,
            amount: bet.amount
          }
          // either destroy, update or create
          if (bet.status == 'delete') {
            // destroy
            promises.push(models.Bet.destroy({ where: { id: bet.pid } }).catch(e => { console.log({ mid: bet.mid, err: e }) }));
          } else {
            if (bet.pid && bet.prediction && bet.mid && bet.amount) {
              // update
              promises.push(models.Bet.update(obj, { where: { id: bet.pid } }).catch(e => { console.log(e); }))
            } else if (bet.prediction && bet.mid && bet.amount) {
              // create
              promises.push(models.Bet.create(obj).catch(e => { console.log(e) }));
            }
          }
        }
        return Promise.all(promises).then(ret => {
          return ret.length;
        });

      },

    }
  }, {
    tableName: 'bets',
    freezeTableName: true
  })

}

module.exports = bets;