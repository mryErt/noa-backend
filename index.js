const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./models/user');

const app = express();

// --- CORS AYARI ---
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// --- MONGODB BAĞLANTISI ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Bağlantısı Başarılı!"))
    .catch(err => console.log("Bağlantı Hatası:", err));

// --- KAYIT OLMA (E-POSTA ZORUNLULUĞU KALDIRILDI) ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, tcIlk4 } = req.body;

        // Temel alanların kontrolü
        if (!username || !password || !tcIlk4) {
            return res.status(400).json({ error: "Kullanıcı adı, şifre ve T.C. ilk 4 hane zorunludur!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({
            username,
            password: hashedPassword,
            tcIlk4,
            email: "", // Artık boş gönderiyoruz, çakışma yaratmıyor
            projeler: []
        });

        await newUser.save();
        res.status(201).json({ message: "Kullanıcı başarıyla oluşturuldu" });
    } catch (err) {
        console.error("Kayıt Hatası:", err);
        // MongoDB benzersizlik hatası (Duplicate Key) kontrolü
        if (err.code === 11000) {
            return res.status(400).json({ error: "Bu kullanıcı adı zaten alınmış!" });
        }
        res.status(500).json({ error: "Sunucu hatası oluştu: " + err.message });
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
        
        res.json({
            user: {
                username: user.username,
                projeler: user.projeler || []
            }
        });
    } catch (err) {
        console.error("Giriş Hatası:", err);
        res.status(500).json({ error: "Giriş yapılırken bir hata oluştu" });
    }
});

// --- VERİLERİ KALICI KAYDETME ---
app.post('/api/update-data', async (req, res) => {
    const { username, projeler } = req.body;
    try {
        await User.findOneAndUpdate({ username }, { projeler });
        res.json({ message: "Kaydedildi" });
    } catch (err) {
        console.error("Güncelleme Hatası:", err);
        res.status(500).json({ error: "Kayıt hatası" });
    }
});

// --- ŞİFRE DEĞİŞTİRME (AYARLAR İÇİNDEN) ---
app.post('/api/change-password', async (req, res) => {
    try {
        const { username, oldPassword, newPassword } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
        
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: "Mevcut şifreniz hatalı" });
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        res.json({ message: "Şifre başarıyla güncellendi" });
    } catch (err) {
        res.status(500).json({ error: "Şifre değiştirilirken bir hata oluştu" });
    }
});

// --- T.C. KİMLİK İLE ŞİFRE SIFIRLAMA ---
app.post('/api/verify-tc-and-change', async (req, res) => {
    try {
        const { username, tcIlk4, newPassword } = req.body;

        const user = await User.findOne({ username, tcIlk4 });

        if (!user) {
            return res.status(400).json({ error: "Kullanıcı adı veya T.C. bilgisi hatalı!" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: "Şifreniz başarıyla sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz." });
    } catch (err) {
        console.error("Şifre Sıfırlama Hatası:", err);
        res.status(500).json({ error: "Şifre güncellenirken bir hata oluştu" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda çalışıyor`));