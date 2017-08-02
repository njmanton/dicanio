// jshint node: true, esversion: 6
'use strict';

const khistories = (sequelize, DataTypes) => {

  return sequelize.define('kentries', {
    id: {
      type: DataTypes.INTEGER(10),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    killer_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false  
    },
    team_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null        
    },
  }, {
    tableName: 'khistories',
    freezeTableName: true
  })
};

module.exports = khistories;