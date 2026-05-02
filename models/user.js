const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true 
    },

    // Email alanını isteğe bağlı (optional) hale getirdik.
    // Böylece 'Kullanıcı zaten var' hatasının önüne geçiyoruz.
    email: {
        type: String,
        default: ""
    },

    password: { 
        type: String, 
        required: true 
    },

    // Şifre sıfırlama için T.C. Kimlik numarasının ilk 4 hanesini tutuyoruz.
    tcIlk4: {
        type: String,
        required: true
    },

    // Projeler listesi
    projeler: { 
        type: Array, 
        default: [] 
    } 
});

module.exports = mongoose.model('User', UserSchema);