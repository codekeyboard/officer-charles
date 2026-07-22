'use strict';

// Centralized Sequelize setup using app config.
// Provides a singleton Sequelize instance and a base Model class
// for defining models in a class-based style.

const path = require('path');
const { Sequelize, DataTypes, Model: SequelizeModel } = require('sequelize');
const config = require('@core/util/functions/config');

let sequelizeInstance = null;

function buildSequelize() {
  const dbCfg = { ...(config('db') || {}) };

  // Normalize sqlite storage path to absolute for CLI/tests reliability
  if (
    dbCfg.dialect === 'sqlite' &&
    dbCfg.storage &&
    typeof dbCfg.storage === 'string' &&
    !path.isAbsolute(dbCfg.storage)
  ) {
    dbCfg.storage = path.join(process.cwd(), dbCfg.storage);
  }

  if (dbCfg.url) {
    return new Sequelize(dbCfg.url, dbCfg);
  }
  return new Sequelize({ ...dbCfg });
}

function getSequelize() {
  if (!sequelizeInstance) {
    sequelizeInstance = buildSequelize();
  }
  return sequelizeInstance;
}

class BaseModel extends SequelizeModel {
  // Convenience init that binds configured sequelize
  static initModel(attributes, options = {}) {
    return super.init(attributes, { sequelize: getSequelize(), ...options });
  }
}

module.exports = {
  sequelize: getSequelize(),
  Sequelize,
  DataTypes,
  Model: BaseModel,
};

