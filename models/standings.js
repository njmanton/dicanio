// jshint node: true, esversion: 6
'use strict';

const standings = (sequelize, DataTypes) => {

  return sequelize.define('standings', {
    id: {
      type: DataTypes.INTEGER(10),
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
    points: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: true,
    }
  }, {
    classMethods: {
      week: (wid, uid) => {
        const models = require('.');
        let options = {
          where: { week_id: wid },
          attributes: ['week_id', 'user_id', 'points', 'position'],
          include: {
            model: models.User,
            attributes: ['username']
          }
        };
        return models.Standing.findAll(options).then(table => {
          table.map(item => { 
            item.self = item.user_id == uid,
            item.user = item.user.username });
          return table;
        })
      }, 

      overall: (uid, wid, single) => {
        // calculate the overall standings for the league up to the given week
        // or just for that week if third parameter passed as true
        
        const models = require('.'),
              Promise = require('bluebird'),
              config = require('../config');

        let start = (single) ? wid : config.goalmine.league_start;

        let sql = 'SELECT U.id, U.username, COUNT(S.points) AS games, SUM(S.points) AS points, MIN(S.points) AS min FROM standings S INNER JOIN users U ON U.id = S.user_id WHERE S.week_id >= :start AND S.week_id <= :end GROUP BY U.id, U.username';
        let curr = models.sequelize.query(sql, { 
          replacements: { 
            start: start, 
            end: wid },
          type: sequelize.QueryTypes.SELECT 
        });
        let prev = models.sequelize.query(sql, { 
          replacements: { 
            start: start, 
            end: wid - 1 },
          type: sequelize.QueryTypes.SELECT 
        });

        return Promise.join(curr, prev, (curr, prev) => {
          
          curr.sort((a, b) => { return b.points - a.points });
          prev.sort((a, b) => { return b.points - a.points });
          // calculate the rank on each array
          let row = 0,
              rank = 1,
              prevpts = 0;
          prev.map(line => {
            if (line.points == prevpts) {
              row++;
            } else {
              rank = ++row;
            }
            prevpts = line.points;
            line.rank = rank;
          })          

          row = 0; rank = 1; prevpts = 0;
          curr.map(line => {
            let prevpos = prev.find(ele => {
              return (ele.username == line.username)
            })
            line.prevrank = prevpos ? prevpos.rank : 999;
            if (line.points == prevpts) {
              row++;
            } else {
              rank = ++row;
            }
            prevpts = line.points;
            line.rank = rank;
            line.self = (line.id == uid);
            if (line.prevrank == line.rank) {
              line.symbol = '▶︎';
              line.class = 'level';
            } else if (line.prevrank > line.rank) {
              line.symbol = '▲';
              line.class = 'up';
            } else {
              line.symbol = '▼';
              line.class = 'down';
            }
          })
          return curr;
        })

      },

      updateTable: mid => {
        // this updates the standings table for a week, whenever a match is updated
        // first destroy the current rows for that week, then rebuild it
        const models = require('.'),
              logger = require('winston');

        return models.Match.findById(mid, { attributes: ['week_id', 'game'] }).then(m => {
          if ((m.game & 1) == 0) {
            return false;
          } else {
            return models.Standing.destroy({ where: { week_id: m.week_id } }).then(d => { 
              return models.Prediction.table(m.week_id).then(table => {
                let row = 0, rank = 1, prev = 0;

                let rankings = table.players
                  .filter(row => row.user != undefined)
                  .sort((a, b) => (b.points - a.points));

                  console.log(rankings);
                rankings.map(line => {
                  if (line.points == prev) {
                    row++;
                  } else {
                    rank = ++row;
                  }
                  prev = line.points;
                  line.position = rank;
                  line.user_id = line.id;
                  delete line.closest;
                  delete line.user;
                  delete line.total;
                  delete line.id
                  line.week_id = m.week_id;
                })

                console.log(rankings);
                console.log('--------');

                return models.Standing.bulkCreate(rankings).then(ins => {
                  logger.info(`updating match ${ mid } recreated ${ ins.length }/${ d } standings for week ${ m.week_id }`);
                  return ins;
                }).catch(e => { console.log(e.name); logger.error(e); });

              })
            })
          }
        })
      }
    }
  },
  {
    tableName: 'standings',
    freezeTableName: true
  })
};

module.exports = standings;