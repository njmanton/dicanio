// jshint node: true, esversion: 6
'use strict';

const killers = (sequelize, DataTypes) => {

  return sequelize.define('killers', {
    id: {
      type: DataTypes.INTEGER(10),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    description: {
      type: DataTypes.STRING(256),
      allowNull: false
    },
    start_week: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    complete: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    }
  }, {
    classMethods: {
      table: (kid, uid) => {

        const models = require('.'),
              moment = require('moment'),
              utils  = require('../utils');

        return models.Killer.findById(kid, {
          attributes: ['id', 'description', 'complete'],
          include: {
            model: models.Kentry,
            attributes: ['round_id', 'week_id', 'user_id', 'match_id', 'pred', 'lives'],
            include: [{
              model: models.Week,
              attributes: ['id', 'start']
            }, {
              model: models.Match,
              attributes: ['id', 'result', 'date'],
              include: [{
                model: models.Team,
                as: 'TeamA',
                attributes: ['id', 'name', 'sname']
              }, {
                model: models.Team,
                as: 'TeamB',
                attributes: ['id', 'name', 'sname']
              }]
            }, {
              model: models.User,
              attributes: ['id', 'username']
            }]
          }
        }).then(game => {
          let data = { game: {}, rounds: {} };
          data.game = {
            id: game.id,
            desc: game.description,
            complete: game.complete
          };
          let kentry = null;
          for (let x = 0; x < game.kentries.length; x++) {
            kentry = game.kentries[x];
            if (!(kentry.round_id in data.rounds)) {
              data.rounds[kentry.round_id] = {
                week: kentry.week_id,
                entries: []
              }
            }
            let expired = moment(kentry.week.start) <= moment();
            let pred = '';
            if (kentry.pred == 1) {
              pred = 'Home';
            } else if (kentry.pred == 2) {
              pred = 'Away';
            } else {
              pred = 'Draw';
            }

            // build the fixture label
            // if no mid, show 'no match entered'
            // if user logged or after expiry show match
            // else show match entered
            let fixture = '';
            if (kentry.match) {
              if (expired || (uid == kentry.user.id)) {
                fixture = [kentry.match.TeamA.name, kentry.match.TeamB.name].join(' v ');
              } else {
                fixture = 'match entered';
              }
            } else {
              fixture = 'no match entered';
            }

            // was the prediction right?
            let lost = kentry.match ? (utils.calc(kentry.pred, kentry.match.result, 0) > 0) : false;

            // label for remaining lives
            let livesLeft = '';
            if ((kentry.lives < 2) && lost) {
              livesLeft = '<span>&#9760;</span>';
            } else {
              let heart = '<span>♥</span>';
              let lostheart = '<span class="lost">♥</span>'
              if (lost) {
                livesLeft = heart.repeat(kentry.lives - 1) + lostheart;
              } else {
                livesLeft = heart.repeat(kentry.lives);
              }
            } 
            data.rounds[kentry.round_id].entries.push({
              uid: kentry.user.id,
              date: kentry.match ? moment(kentry.match.date).format('YYYY-MM-DD') : '-',
              user: kentry.user.username,
              mid: kentry.match ? kentry.match.id : null,
              fixture: fixture,
              result: kentry.match ? kentry.match.result : '-',
              pred: pred,
              editable: (!expired && (uid == kentry.user.id)),
              lostlife: lost,
              livesLeft: livesLeft
            })
          }
          return data;
        })
      },

      updateKiller: mid => {
        
        const models = require('.'),
              moment = require('moment'),
              utils  = require('../utils');

        // this performs workflow when a killer game has been updated
        // check the predictions for that game and add new kentry entries if still alive
        return models.Kentry.findAll({
          where: { match_id: mid },
          include: {
            model: models.Match,
            attributes: ['id', 'result']
          }
        }).then(kentries => {

          for (var kentry in kentries) {
            let promises = [];
            let lives = kentry.lives;
            if (utils.calc(kentry.pred, kentry.match.result, 0) <= 0) {
              // prediction wrong, remove a life
              lives--;
            }

            if (lives > 0) {
              // still alive
              // send an email
              // create a new kentry record for the following week
              promises.push(models.Kentry.findOne({
                where: { user_id: kentry.user_id, round_id: kentry.round_id, killer_id: kentry.killer_id }
              }).then(k => {
                let data = {
                  killer_id: kentry.killer_id,
                  user_id: kentry.user_id,
                  round_id: kentry.round_id + 1,
                  week_id: kentry.week_id + 1,
                  lives: lives
                }
                if (k) {
                  k.update(data);
                } else {
                  models.Kentry.create(data);
                }
                // send an email
              }))
            } else {
              // dead!
              // send an email
            }
          }
          return false;         
        })
      },

      killerEntry: (kid, uid) => {

        const models  = require('.'),
              Promise = require('bluebird'),
              moment  = require('moment');

        let round = models.Kentry.findOne({
          where: { user_id: uid, killer_id: kid },
          order: [['round_id', 'DESC']],
          include: [{
            model: models.Week,
            attributes: ['id', 'start']
          } ,{
            model: models.Match,
            attributes: ['id', 'date', 'result'],
            include: [{
                model: models.Team,
                as: 'TeamA',
                attributes: ['id', 'name', 'sname']
              }, {
                model: models.Team,
                as: 'TeamB',
                attributes: ['id', 'name', 'sname']
              }]
          }]
        });

        let histories = models.Khistory.findAll({
          where: { user_id: uid, killer_id: kid },
          attributes: ['id', 'team_id'],
          include: {
            model: models.Team,
            attributes: ['id', 'name']
          }
        });

        return Promise.join(round, histories, (kentry, teams) => {

          // array of dates for edit form
          let dates = [];
          for (let x = 0; x < 7; x++) {
            dates.push({ 
              id: moment(kentry.week.start).add(x, 'd').format('YYYY-MM-DD'), 
              date: moment(kentry.week.start).add(x, 'd').format('dddd, D MMM'),
              sel: kentry.match ? moment(kentry.match.date).diff(moment(kentry.week.start), 'days') == x : false
            });
          }
          return {
            kentry: kentry,
            teams: teams,
            dates: dates
          }

        })

      }
    }
  }, {
    tableName: 'killers',
    freezeTableName: true
  })
};

module.exports = killers;