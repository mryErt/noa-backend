const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // bcryptjs kullandığından emin ol
const jwt = require('jsonwebtoken');

const User = require('./models/user');

const app = express();

// --- CORS AYARI (GÜNCELLENDİ) ---
app.use(cors({
  origin: true, // Gelen isteğin kökenine (Vercel) otomatik izin verir
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// --- MONGODB BAĞLANTISI ---
mongoose.connect('mongodb+srv://miraysser17_db_user:Mff5bnky17@cluster0.pkehgea.mongodb.net/noa_muhasebe?retryWrites=true&w=majority')
    .then(() => console.log("MongoDB Bağlantısı Başarılı!"))
    .catch(err => console.log("Bağlantı Hatası:", err));

// --- KAYIT OLMA ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, firmalar: [] });
        await newUser.save();
        res.status(201).json({ message: "Kullanıcı oluşturuldu" });
    } catch (err) {
        console.error("Kayıt Hatası:", err);
        res.status(500).json({ error: "Kullanıcı zaten var veya sunucu hatası!" });
    }
});

// --- GİRİŞ YAPMA ---
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: "Kullanıcı bulunamadı" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Şifre hatalı" });

        res.json({ user: { username: user.username, firmalar: user.firmalar } });
    } catch (err) {
        console.error("Giriş Hatası:", err);
        res.status(500).json({ error: "Giriş yapılırken bir hata oluştu" });
    }
});

// --- VERİLERİ KALICI KAYDETME ---
app.post('/api/update-data', async (req, res) => {
    const { username, firmalar } = req.body;
    try {
        await User.findOneAndUpdate({ username }, { firmalar });
        res.json({ message: "Kaydedildi" });
    } catch (err) {
        console.error("Güncelleme Hatası:", err);
        res.status(500).json({ error: "Kayıt hatası" });
    }
});

// --- PORT AYARI (RENDER İÇİN KRİTİK) ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda çalışıyor`));