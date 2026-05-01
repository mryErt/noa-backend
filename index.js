const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer'); // Bu satırı ekliyoruz

const User = require('./models/user');

const app = express();

// --- KOD SAKLAMA ALANI (RAM ÜZERİNDE GEÇİCİ) ---
let dogrulamaKodlari = {}; 

// --- GMAIL TRANSPORTER AYARI ---
// Bu kısım postacı görevini görür.
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, 
  auth: {
    user: 'miray.ert15.com', // Kendi Gmail adresin
    pass: 'zonf sger sike jyxs' // Google'dan aldığın kod
  },
  tls: {
    rejectUnauthorized: false // Render üzerinde hata almamak için kritik
  }
});

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

// --- KAYIT OLMA ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, projeler: [] });
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

        res.json({ user: { username: user.username, projeler: user.projeler || [] } });
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

// --- ŞİFRE DEĞİŞTİRME (ESKİ ŞİFRE İLE) ---
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

// --- E-POSTA KODU GÖNDERME (GMAIL ENTEGRASYONU) ---
app.post('/api/send-otp', async (req, res) => {
    try {
        const { username, email } = req.body; 
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

        const otp = Math.floor(100000 + Math.random() * 900000); 
        dogrulamaKodlari[username] = otp;
        
        const mailOptions = {
            from: 'miraysser17@gmail.com',
            to: email, // Dinamik olarak ekrandaki adrese gider
            subject: 'NOA YAZILIM - Doğrulama Kodu',
            text: `Merhaba ${username},\n\nŞifrenizi sıfırlamak için doğrulama kodunuz: ${otp}`
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: "Doğrulama kodu e-posta adresinize gönderildi!" });
    } catch (err) {
        console.error("E-posta Hatası:", err);
        res.status(500).json({ error: "Kod gönderilemedi. Gmail ayarlarını kontrol edin." });
    }
});

// --- KOD İLE ŞİFRE SIFIRLAMA ---
app.post('/api/verify-otp-and-change', async (req, res) => {
    try {
        const { username, otp, newPassword } = req.body;
        
        if (!dogrulamaKodlari[username] || dogrulamaKodlari[username].toString() !== otp.toString()) {
            return res.status(400).json({ error: "Doğrulama kodu hatalı!" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findOneAndUpdate({ username }, { password: hashedPassword });
        delete dogrulamaKodlari[username];
        
        res.json({ message: "Şifre başarıyla değiştirildi" });
    } catch (err) {
        res.status(500).json({ error: "Şifre güncellenirken bir hata oluştu" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda çalışıyor`));