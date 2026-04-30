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

// --- KAYIT OLMA (firmalar -> projeler olarak güncellendi) ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        // Yeni kullanıcı artık boş bir projeler listesiyle oluşur
        const newUser = new User({ username, password: hashedPassword, projeler: [] });
        await newUser.save();
        res.status(201).json({ message: "Kullanıcı oluşturuldu" });
    } catch (err) {
        console.error("Kayıt Hatası:", err);
        res.status(500).json({ error: "Kullanıcı zaten var veya sunucu hatası!" });
    }
});

// --- GİRİŞ YAPMA (firmalar -> projeler olarak güncellendi) ---
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: "Kullanıcı bulunamadı" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Şifre hatalı" });

        // Giriş yapınca projeleri frontend'e gönderiyoruz
        res.json({ user: { username: user.username, projeler: user.projeler || [] } });
    } catch (err) {
        console.error("Giriş Hatası:", err);
        res.status(500).json({ error: "Giriş yapılırken bir hata oluştu" });
    }
});

// --- VERİLERİ KALICI KAYDETME (Kritik Değişiklik) ---
app.post('/api/update-data', async (req, res) => {
    const { username, projeler } = req.body; // Artık 'projeler' alıyoruz
    try {
        // Kullanıcının projeler alanını güncelliyoruz
        await User.findOneAndUpdate({ username }, { projeler });
        res.json({ message: "Kaydedildi" });
    } catch (err) {
        console.error("Güncelleme Hatası:", err);
        res.status(500).json({ error: "Kayıt hatası" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda çalışıyor`));