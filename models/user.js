const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firmalar: { type: Array, default: [] } // Senin maliyet verilerin burada saklanacak
});

module.exports = mongoose.model('User', UserSchema);