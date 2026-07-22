'use strict';

const fs = require('fs');
const path = require('path');
const { sequelize, Sequelize, DataTypes, Model } = require('@core/util/classes/Model');

const db = {
  sequelize,
  Sequelize,
  DataTypes,
  Model
};

fs.readdirSync(__dirname)
  .filter((file) => file !== 'index.js' && file.endsWith('.js'))
  .forEach((file) => {
    const modelModule = require(path.join(__dirname, file));
    const defineModel = modelModule.default || modelModule;
    if (typeof defineModel === 'function') {
      const model = defineModel(sequelize, DataTypes);
      db[model.name] = model;
    }
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName] && typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
});

module.exports = db;
