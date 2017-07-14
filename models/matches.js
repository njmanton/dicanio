// jshint node: true, esversion: 6
'use strict';

const matches = (sequelize, DataTypes) => {
  
  return sequelize.define('matches', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    teama_id: {
      type: DataTypes.INTEGER(4),
      allowNull: true
    },
    teamb_id: {
      type: DataTypes.INTEGER(4),
      allowNull: true
    },
    league_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    gotw: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    result: {
      type: DataTypes.STRING,
      allowNull: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    week_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    odds1: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    odds2: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    oddsX: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    game: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    classMethods: {
      outstanding: () => {

        const models = require('.'),
              config = require('../config'),
              moment = require('moment');

        let now = moment();
        return models.Match.findAll({
          where: { date: { $lt: now }, result: null, week_id: { $gte: config.goalmine.league_start } },
          attributes: ['id', 'date', 'result', 'week_id'],
          include: [{
            model: models.Team,
            as: 'TeamA',
            attributes: ['name']
          }, {
            model: models.Team,
            as: 'TeamB',
            attributes: ['name']
          }, {
            model: models.League,
            attributes: ['name']
          }]
        }).then(matches => {
          matches.map(m => { m.fdate = moment(m.date).format('ddd DD MMM') });
          return matches;
        })
      }

    }
  }, {
    tableName: 'matches',
    freezeTableName: true
  })

}

module.exports = matches;