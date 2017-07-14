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
    tableName: 'killers',
    freezeTableName: true
  })
};

module.exports = killers;