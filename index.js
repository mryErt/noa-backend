const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./models/user');

const app = express();
app.use(express.json());
app.use(cors({
  origin: "*", // Tüm dünyadan (yani Vercel'den) gelen isteklere izin ver
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

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
        res.status(500).json({ error: "Kullanıcı zaten var!" });
    }
});

// --- GİRİŞ YAPMA ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "Kullanıcı bulunamadı" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Şifre hatalı" });

    res.json({ user: { username: user.username, firmalar: user.firmalar } });
});

// --- VERİLERİ KALICI KAYDETME (YENİ EKLEDİĞİMİZ KISIM) ---
app.post('/api/update-data', async (req, res) => {
    const { username, firmalar } = req.body;
    try {
        await User.findOneAndUpdate({ username }, { firmalar });
        res.json({ message: "Kaydedildi" });
    } catch (err) {
        res.status(500).json({ error: "Kayıt hatası" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda çalışıyor`));