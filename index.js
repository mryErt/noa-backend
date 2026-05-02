const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const User = require('./models/user');

const app = express();

// --- KOD SAKLAMA ALANI (RAM ÜZERİNDE GEÇİCİ) ---
let dogrulamaKodlari = {};

// --- GMAIL TRANSPORTER AYARI (IPv4 ZORLAMALI & SÜPER AYARLANMIŞ) ---
const transporter = nodemailer.createTransport({
  // smtp.gmail.com yerine doğrudan Google IPv4 adresi kullanıyoruz
  host: '74.125.195.108', 
  port: 465,
  secure: true,
  auth: {
    // Çevre değişkenlerinden çekiyoruz
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false, // Sunucu sertifika hatalarını önlemek için kritik
    servername: 'smtp.gmail.com' // IP kullandığımız için bu şart
  },
  debug: true, // Hata olursa loglarda detaylı görebilmemiz için
  logger: true, // Adım adım gönderim sürecini izlemek için
  connectionTimeout: 10000, // 10 saniye bağlantı sınırı
  greetingTimeout: 5000,
  socketTimeout: 15000
});

// Bağlantının hazır olup olmadığını loglarda kontrol etmemizi sağlar
transporter.verify((error, success) => {
  if (error) {
    console.log("Posta sunucusu hatası (Bağlantı kurulamadı):", error);
  } else {
    console.log("Posta sunucusu e-posta göndermeye hazır!");
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
        const { username, password, email } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            projeler: []
        });

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

        res.json({
            user: {
                username: user.username,
                email: user.email,
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

// --- E-POSTA KODU GÖNDERME ---
app.post('/api/send-otp', async (req, res) => {
    try {
        const { username, email } = req.body;

        // Kullanıcı adı + email eşleşmesi kontrolü
        const user = await User.findOne({ username, email });

        if (!user) {
            return res.status(404).json({
                error: "Kullanıcı adı veya e-posta yanlış"
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        dogrulamaKodlari[username] = otp;

        const mailOptions = {
            from: '"NOA YAZILIM" <miraysser17@gmail.com>',
            to: email,
            subject: 'Güvenlik Kodu: Şifre Sıfırlama',
            text: `Merhaba ${username},\n\nSisteme giriş yapmak için kullanacağınız doğrulama kodunuz: ${otp}\n\nBu kod tek kullanımlıktır.`
        };

        await transporter.sendMail(mailOptions);
        console.log(`${email} adresine kod başarıyla gönderildi.`);

        res.json({
            message: "Doğrulama kodu e-posta adresinize gönderildi!"
        });

    } catch (err) {
        console.error("E-posta Hatası Detayı:", err);
        res.status(500).json({
            error: "Kod gönderilemedi. Gmail ayarlarını veya uygulama şifresini kontrol edin."
        });
    }
});

// --- KOD İLE ŞİFRE SIFIRLAMA ---
app.post('/api/verify-otp-and-change', async (req, res) => {
    try {
        const { username, otp, newPassword } = req.body;

        if (
            !dogrulamaKodlari[username] ||
            dogrulamaKodlari[username].toString() !== otp.toString()
        ) {
            return res.status(400).json({
                error: "Doğrulama kodu hatalı!"
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.findOneAndUpdate(
            { username },
            { password: hashedPassword }
        );

        delete dogrulamaKodlari[username];
        res.json({
            message: "Şifre başarıyla değiştirildi"
        });

    } catch (err) {
        res.status(500).json({
            error: "Şifre güncellenirken bir hata oluştu"
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
    console.log(`Server ${PORT} portunda çalışıyor`)
);