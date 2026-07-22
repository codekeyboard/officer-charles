'use strict';

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('AppSetting', {
    key: {
      type: DataTypes.STRING(120),
      primaryKey: true,
      allowNull: false
    },
    value: {
      type: DataTypes.JSONB,
      allowNull: false
    }
  }, {
    tableName: 'app_settings',
    underscored: true
  });
};
