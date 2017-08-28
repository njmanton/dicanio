// jshint node: true, esversion: 6
'use strict';

const places = (sequelize, DataTypes) => {

  return sequelize.define('places', {
    id: {
      type: DataTypes.INTEGER(10),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    week_id: {
      type: DataTypes.INTEGER,
      allowNull: false         
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false  
    },
    match_id: {
      type: DataTypes.INTEGER,
      allowNull: false        
    },
    balance: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    rank: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    classMethods: {
      updateTable: mid => {
        const models  = require('.'),
              Promise = require('bluebird'),
              logger  = require('winston');

        let timeStart = new Date();
        return models.Match.findById(mid, { attributes: ['week_id', 'game'] }).then(m => {
          if ((m.game & 2) == 0) {
            return false;
          } else {
            return models.Place.destroy({ where: { week_id: m.week_id } }).then(d => {
              let players = models.User.findAll({
                where: sequelize.where(sequelize.literal('games & 2'), '!=', 0),
                attributes: ['id', 'username']
              });
              let bets = models.Bet.findAll({
                attributes: ['id', 'outcome', 'user_id'],
                include: {
                  model: models.Match,
                  attributes: ['id'],
                  where: { week_id: m.week_id }
                },
              });
              return Promise.join(players, bets, (p, b) => {
                let players = [], player = {};

                p.map(element => {
                  player = {
                    user_id: element.id,
                    balance: 0,
                    week_id: m.week_id,
                    rank: 0,
                    bets: 0
                  };
                  players.push(player);
                })

                for (let x = 0; x < b.length; x++) {
                  let scan = players.find(ele => {
                    return ele.user_id == b[x].user_id;
                  })
                  if (scan !== undefined) {
                    scan.balance += b[x].outcome;
                    scan.bets++;
                  }
                }
                players.sort((a, b) => b.balance - a.balance);

                let row = 0,
                    rank = 1,
                    prev = null;

                players.map(line => {
                  if (line.balance == prev) {
                    row++;
                  } else {
                    rank = ++row;
                  }
                  prev = line.balance;
                  line.rank = rank;
                  if (line.bets == 0) {
                    line.balance = -100;
                  }
                  delete line.bets;
                })
                return models.Place.bulkCreate(players).then(ins => {
                  let timeEnd = new Date();

                  logger.info(`updated match ${ mid }, recreating ${ ins.length }/${ d } places for week ${ m.week_id } in ${ timeEnd - timeStart }ms`);
                  return ins;
                }).catch(e => {
                  logger.error(e)
                });
              })

            })
          }
        })
      },

      // show the standings up to the given week
      // if single is passed as true, then only calculate that week
      overall: (uid, wid, single) => {
        const models = require('.'),
              Promise = require('bluebird'),
              config = require('../config');

        let start = (single) ? wid : config.goalmine.league_start;

        let sql = 'SELECT U.id, U.username, SUM(P.balance) AS balance FROM places P INNER JOIN users U ON U.id = P.user_id WHERE P.week_id >= :start AND P.week_id <= :end GROUP BY U.id, U.username';
        let curr = models.sequelize.query(sql, { 
          replacements: { 
            start: start, 
            end: wid - 1 },
          type: sequelize.QueryTypes.SELECT
        });
        let prev = models.sequelize.query(sql, { 
          replacements: { 
            start: start, 
            end: wid - 2 },
          type: sequelize.QueryTypes.SELECT
        });

        return Promise.join(curr, prev, (curr, prev) => {

          curr.sort((a, b) => (b.balance - a.balance) );
          prev.sort((a, b) => (b.balance - a.balance) );

          // calculate the rank on each array
          let row = 0,
              rank = 1,
              prevbal = 0;
          prev.map(line => {
            if (line.balance == prevbal) {
              row++;
            } else {
              rank = ++row;
            }
            prevbal = line.balance;
            line.rank = rank;
          })          

          row = 0; rank = 1; prevbal = 0;
          let rowabove = 0;
          curr.map(line => {
            let prevpos = prev.find(ele => {
              return (ele.username == line.username)
            })
            line.prevrank = prevpos ? prevpos.rank : 999;
            if (line.balance == prevbal) {
              row++;
            } else {
              rank = ++row;
            }
            prevbal = line.balance;
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
            if (rowabove > 0 && line.balance < 0) {
              line.breakeven = true;
            }
            rowabove = line.balance;            
            line.balance = line.balance.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
            line.prevbal = prevpos ? prevpos.balance.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' }) : 0;

          })
          return curr;
        })

      }
    }
  }, {
    tableName: 'places',
    freezeTableName: true
  })
};

module.exports = places;