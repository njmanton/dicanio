// jshint node: true, esversion: 6
'use strict';

const leagues = (sequelize, DataTypes) => {

  return sequelize.define('leagues', {
    id: {
      type: DataTypes.INTEGER(10),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    country: {
      type: DataTypes.STRING(3),
      allowNull: true
    },
    sport: {
      type: DataTypes.STRING(20),
      allowNull: true
    }
  }, {
    tableName: 'leagues',
    freezeTableName: true
  })

}

module.exports = leagues;