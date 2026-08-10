const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  action: {
    type: String,
    required: true
  },
  details: String,
  userEmail: String
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
