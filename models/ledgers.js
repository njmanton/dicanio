// jshint node: true, esversion: 6
'use strict';

const ledgers = (sequelize, DataTypes) => {

  return sequelize.define('ledgers', {
    id: {
      type: DataTypes.INTEGER(10),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    description: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    classMethods: {
      view: uid => {

        const models = require('.'),
              config = require('../config'),
              moment = require('moment');

        return models.Ledger.findAll({
          where: { user_id: uid, updatedAt: { $gte: '2017-08-01' } },
          attributes: ['id', 'description', 'amount', 'createdAt', 'updatedAt'],
          include: {
            model: models.User,
            attributes: ['id', 'username']
          }
        }).then(d => {
          if (!d.length) {
            return null;
          } else {
            let u = (uid == 0) ? 'Pot' : d[0].user.username;
            let running = 0;
            d.map(i => { 
              i.date = moment(i.updatedAt).format('ddd DD MMM');
              i.balance = (i.amount + running);
              running += i.amount;
              i.negbalance = i.balance < 0;
              i.negamt = i.amount < 0;
              i.balance = i.balance.toLocaleString('en-GB', { style: 'currency', currency: 'GBP'});
              i.amount = i.amount.toLocaleString('en-GB', { style: 'currency', currency: 'GBP'});
            });
            return {
              username: u,
              rows: d
            }
          }
        })

      },

      balance: uid => {

        const models = require('.');

        return models.Ledger.findAll({
          where: { user_id: uid, updatedAt: { $gte: '2017-08-01'} },
          attributes: ['amount']
        }).then(rows => {
          return rows.map(el => el.amount).reduce((sum, value) => sum + value, 0);
        })
      }
    }
  }, {
    tableName: 'ledgers',
    freezeTableName: true
  })
};

module.exports = ledgers;