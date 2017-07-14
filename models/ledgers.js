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
    tableName: 'ledgers',
    freezeTableName: true
  })
};

module.exports = ledgers;