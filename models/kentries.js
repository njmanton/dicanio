// jshint node: true, esversion: 6
'use strict';

const kentries = (sequelize, DataTypes) => {

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
    round_id: {
      type: DataTypes.INTEGER,
      allowNull: false     
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
    pred: {
      type: DataTypes.ENUM,
      values: ['1', '2', 'X']
    },
    lives: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    
  }, {
    tableName: 'kentries',
    freezeTableName: true
  })
};

module.exports = kentries;