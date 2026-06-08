const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'manager', 'employee'],
    default: 'admin'
  },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);
