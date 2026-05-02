const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true 
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: { 
        type: String, 
        required: true 
    },

    // --- YENİ GÜVENLİK ALANI ---
    // Şifre sıfırlama için T.C. Kimlik numarasının ilk 4 hanesini tutuyoruz.
    tcIlk4: {
        type: String,
        required: true
    },

    // Artık 'firmalar' yerine 'projeler' listesi tutuyoruz.
    // Her projenin içinde kendi firma listesi saklanacak.
    projeler: { 
        type: Array, 
        default: [] 
    } 
});

module.exports = mongoose.model('User', UserSchema);