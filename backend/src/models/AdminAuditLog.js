'use strict';

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('AdminAuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    adminUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'admin_user_id'
    },
    action: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    method: {
      type: DataTypes.STRING(12),
      allowNull: true
    },
    path: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'status_code'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'admin_audit_logs',
    underscored: true
  });
};
