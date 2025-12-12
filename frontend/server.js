const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Setup Session
app.use(session({
    secret: 'rahasia-tugas-besar',
    resave: false,
    saveUninitialized: true
}));

// URL Service Backend
const COURT_API = 'http://padel-court:4000/';
const BOOKING_API = 'http://padel-booking:4000/';

// --- MIDDLEWARE ---
const requireLogin = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

const requireAdmin = (req, res, next) => {
    if (req.session.role !== 'admin') {
        return res.send('<h1>Akses Ditolak: Khusus Admin</h1><a href="/">Kembali</a>');
    }
    next();
};

app.get('/login', (req, res) => {
    res.send(`
        <body style="font-family: sans-serif; background: #eee; display: flex; justify-content: center; align-items: center; height: 100vh;">
            <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); width: 300px;">
                <h2 style="text-align: center;">🎾 Padel Login</h2>
                <form action="/login" method="POST">
                    <input type="text" name="username" placeholder="Username" style="width: 100%; padding: 10px; margin-bottom: 10px; box-sizing: border-box;" required><br>
                    <input type="password" name="password" placeholder="Password" style="width: 100%; padding: 10px; margin-bottom: 20px; box-sizing: border-box;" required><br>
                    <button type="submit" style="width: 100%; padding: 10px; background: #333; color: white; border: none; cursor: pointer;">Masuk</button>
                </form>
                <p style="font-size: 12px; color: gray; margin-top: 15px;">
                    User: <b>user / user</b><br>Admin: <b>admin / admin</b>
                </p>
            </div>
        </body>
    `);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin') {
        req.session.user = 'admin';
        req.session.role = 'admin';
        res.redirect('/admin');
    } else if (username === 'user' && password === 'user') {
        req.session.user = 'user';
        req.session.role = 'user';
        res.redirect('/');
    } else {
        res.send('<h1>Login Gagal</h1><a href="/login">Coba lagi</a>');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});


// Dashboard User
app.get('/', requireLogin, async (req, res) => {
    if (req.session.role === 'admin') return res.redirect('/admin');

    try {
        const query = `query { courts { id name location price } }`;
        const response = await axios.post(COURT_API, { query });
        const courts = response.data.data.courts || [];

        let html = `
        <body style="font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h1>Halo, ${req.session.user} 👋</h1>
                <a href="/logout" style="color: red;">Logout</a>
            </div>
            <h3>Pilih Lapangan:</h3>
        `;

        courts.forEach(court => {
            html += `
            <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="margin: 0 0 5px 0;">${court.name}</h3>
                    <p style="margin:0; color: #555;">📍 ${court.location} | 💰 Rp ${court.price}</p>
                </div>
                <a href="/booking?courtId=${court.id}&name=${court.name}" style="background: blue; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Booking</a>
            </div>`;
        });
        res.send(html + '</body>');
    } catch (err) { res.send(err.message); }
});

// Form Booking
app.get('/booking', requireLogin, (req, res) => {
    const { courtId, name } = req.query;
    const slots = ["08:00", "10:00", "16:00", "19:00", "20:00"];
    
    let html = `
    <body style="font-family: sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2>Booking: ${name}</h2>
        <form action="/process-booking" method="POST">
            <input type="hidden" name="courtId" value="${courtId}">
            <input type="hidden" name="courtName" value="${name}">
            
            <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Nama Lengkap:</label>
                <input type="text" name="nama" placeholder="Masukkan Nama Anda" required style="width: 100%; padding: 8px; margin-bottom: 10px; box-sizing: border-box;">
                
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Nomor WhatsApp:</label>
                <input type="text" name="noTelp" placeholder="08xxxxxxxx" required style="width: 100%; padding: 8px; box-sizing: border-box;">
            </div>

            <p style="font-weight:bold;">Pilih Jam Besok:</p>
            ${slots.map(t => `<label style="display:block; margin:5px;"><input type="radio" name="time" value="${t}" required> ${t}</label>`).join('')}
            <br>
            <button type="submit" style="background: green; color: white; padding: 10px; width: 100%; border:none; border-radius: 4px; cursor: pointer; font-size: 16px; margin-top: 10px;">Konfirmasi Booking</button>
        </form>
    </body>`;
    res.send(html);
});

// Simpan Booking
app.post('/process-booking', requireLogin, async (req, res) => {
    const { courtId, time, nama, noTelp } = req.body;
    
    const bookingUser = `${nama} (${noTelp})`;
    const dateStr = `Besok, Jam ${time}`;

    const mutation = `mutation { createBooking(user: "${bookingUser}", courtId: "${courtId}", date: "${dateStr}") { id } }`;
    
    try {
        await axios.post(BOOKING_API, { query: mutation });
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.send("Gagal melakukan booking.");
    }
});


// Admin Dashboard
app.get('/admin', requireLogin, requireAdmin, async (req, res) => {
    try {
        const query = `query { courts { id name location price } }`;
        const response = await axios.post(COURT_API, { query });
        const courts = response.data.data.courts || [];

        let html = `
        <body style="font-family: sans-serif; max-width: 900px; margin: 0 auto; padding: 20px;">
            <div style="background: #333; color: white; padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <h2 style="margin:0;">Dashboard Admin 🛡️</h2>
                    <small>Pilih lapangan untuk melihat data penyewa</small>
                </div>
                <a href="/logout" style="color: #ff6b6b; text-decoration: none; font-weight: bold;">Logout</a>
            </div>
        `;

        courts.forEach(court => {
            html += `
            <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; background: white;">
                <div>
                    <h3 style="margin: 0 0 5px 0;">${court.name}</h3>
                    <p style="margin: 0; color: #555;">📍 ${court.location} | 💰 Rp ${court.price}</p>
                </div>
                <a href="/admin/court/${court.id}?name=${encodeURIComponent(court.name)}" 
                   style="background: blue; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                   Lihat Data
                </a>
            </div>`;
        });

        res.send(html + '</body>');
    } catch (err) { res.send("Gagal memuat data lapangan: " + err.message); }
});

// Menampilkan Tabel Booking Per Lapangan
app.get('/admin/court/:courtId', requireLogin, requireAdmin, async (req, res) => {
    const { courtId } = req.params;
    const courtName = req.query.name || 'Detail Lapangan';

    try {
        const query = `query { bookings { id user date courtId } }`;
        
        const response = await axios.post(BOOKING_API, { query });
        const allBookings = response.data.data.bookings || [];

        const filteredBookings = allBookings.filter(b => b.courtId === courtId);

        let html = `
        <body style="font-family: sans-serif; max-width: 900px; margin: 0 auto; padding: 20px;">
            <a href="/admin" style="text-decoration: none; color: #333; display: flex; align-items: center; margin-bottom: 20px;">
                ⬅ Kembali ke Dashboard
            </a>

            <div style="background: white; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="margin:0;">Data Booking: ${courtName}</h2>
                <p>Total Booking: <b>${filteredBookings.length}</b></p>
            </div>

            <table border="1" cellpadding="10" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                <tr style="background: #eee;">
                    <th>ID</th>
                    <th>Nama Penyewa (Kontak)</th>
                    <th>Jadwal</th>
                    <th>Aksi</th>
                </tr>
        `;

        if (filteredBookings.length === 0) {
            html += `<tr><td colspan="4" style="text-align:center; padding: 30px;">Belum ada booking untuk lapangan ini.</td></tr>`;
        } else {
            filteredBookings.forEach(b => {
                html += `
                <tr>
                    <td>#${b.id}</td>
                    <td>${b.user}</td>
                    <td>${b.date}</td>
                    <td style="text-align: center;">
                        <a href="/admin/edit/${b.id}?courtId=${courtId}" style="background: orange; color: black; padding: 5px 10px; text-decoration: none; border-radius: 4px; font-size: 14px;">Edit Jadwal</a>
                    </td>
                </tr>`;
            });
        }
        res.send(html + '</table></body>');
    } catch (err) { 
        console.error(err);
        res.send("Error: " + err.message); 
    }
});

// Admin Edit Page
app.get('/admin/edit/:id', requireLogin, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { courtId } = req.query; 
    
    res.send(`
    <body style="font-family: sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px;">
        <h2>✏️ Edit Booking #${id}</h2>
        <form action="/admin/edit/${id}" method="POST">
            <input type="hidden" name="courtIdRedirect" value="${courtId}">
            <label>Ubah Jadwal Menjadi:</label><br>
            <input type="text" name="newDate" placeholder="Contoh: Lusa, Jam 10:00" style="width: 100%; padding: 10px; margin: 10px 0;" required>
            <button type="submit" style="background: orange; border: none; padding: 10px 20px; cursor: pointer;">Simpan Perubahan</button>
            <a href="/admin" style="margin-left: 10px;">Batal</a>
        </form>
    </body>
    `);
});

app.post('/admin/edit/:id', requireLogin, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { newDate, courtIdRedirect } = req.body;

    const mutation = `mutation { updateBooking(id: "${id}", date: "${newDate}") { id } }`;
    await axios.post(BOOKING_API, { query: mutation });
    
    if(courtIdRedirect && courtIdRedirect !== 'undefined') {
        res.redirect(`/admin/court/${courtIdRedirect}`);
    } else {
        res.redirect('/admin');
    }
});

app.listen(3000, () => {
    console.log('Frontend berjalan di port 3000');
});