// jshint node: true, esversion: 6
'use strict';

const moment  = require('moment'),
      Promise = require('bluebird');

const weeks = (sequelize, DataTypes) => {

  return sequelize.define('weeks', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    start: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    classMethods: {
      current: () => {
        const models  = require('.'),
              today   = moment();
        return models.Week.findOne({
          where: { status: 0 },
          attributes: ['id', 'start', 'status'],
          order: 'start ASC',
          raw: true
        }).then(week => {
          return week;
        }).catch(e => {
          return e;
        })
      },
      
      checkComplete: week => {
        // If all matches in week have a result _and_ week not already finalised, return true
        const models = require('.');

        let weekComplete = models.Week.findById(week),
            existingMatches = models.Match.findAll({
              attributes: ['id'],
              where: { week_id: week}
            }),
            outstandingMatches = models.Match.findAll({
              attributes: ['id'],
              where: { week_id: week, result: null }
            });

        return Promise.join(weekComplete, existingMatches, outstandingMatches, (w, e, o) => {
          return w && w.status == 0 && o.length == 0 && e.length != 0;
        })
      },

      finalise: wid => {
        // this wraps up all the workflows for a given week
        // sets week to status complete, updates ledgers for Goalmine
        const models = require('.'),
              logger = require('winston'),
              config = require('../config');

        let complete = models.Week.update({ status: 1 }, { where: { id: wid } });
        let players = models.Prediction.getPlayers(wid);
        let winners = models.Standing.findAll({ where: { position: 1, week_id: wid }, attributes: ['user_id'] });
        let ledgers = []; // array of promises for ledger entries

        return Promise.join(complete, players, winners, (c, p, w) => {
          
          // winning amount is the number of players that week, times winning percentage, divided by winners          
          let winnings = p.length * config.goalmine.win_pct / w.length;

          // loop through goalmine entries
          for (let x = 0; x < p.length; x++) {
            ledgers.push(models.Ledger.create({ 
              user_id: p[x],
              amount: -1,
              description: 'Entry for week ' + wid
            }).catch(e => {
              console.log(p[x], e);
              logger.error(e);
            }));
          }
          logger.info(`Adding Goalmine entry ledgers for week ${ wid }`)
          // loop through goalmine winners
          for (let y = 0; y < w.length; y++) {
            ledgers.push(models.Ledger.create({
              user_id: w[y].user_id,
              amount: winnings,
              description: 'Winnings for week ' + wid
            }).catch(e => {
              logger.error(e);
            }));
          }
          logger.info(`Adding Goalmine winner ledgers for week ${ wid }`)
          // finally add the pot
          ledgers.push(models.Ledger.create({
            user_id: 0, // user id 0 is the pot
            amount: p.length * (config.goalmine.win_pct - 1),
            description: 'Pot for week ' + wid
          }).catch(e => {
            logger.error(e);
          }));
          logger.info(`Adding Goalmine pot ledger for week ${ wid }`);
        }).then(() => {
          return Promise.all(ledgers);
        }).catch(e => {
          console.log(e);
          logger.error(e);
        })
      }
    }
  },
  {
    tableName: 'weeks',
    freezeTableName: true
  })

}

module.exports = weeks;