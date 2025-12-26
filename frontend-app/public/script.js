// Variabel untuk melacak lapangan yang sedang dilihat admin
let currentAdminCourtId = '';

// --- FUNGSI INIT (Dipanggil dari auth.js setelah login) ---
function initDashboard(user, role) {
    // Tampilkan nama user
    document.getElementById('welcome-msg').innerText = `Halo, ${user} 👋`;

    // Cek Role untuk menentukan tampilan
    if (role === 'admin') {
        document.getElementById('admin-view').classList.remove('hidden');
        document.getElementById('user-view').classList.add('hidden');
        loadCourtsForAdmin();
    } else {
        document.getElementById('user-view').classList.remove('hidden');
        document.getElementById('admin-view').classList.add('hidden');
        loadCourtsForUser();
    }
}

// ==========================================
// BAGIAN 1: LOGIKA USER (BOOKING)
// ==========================================

async function loadCourtsForUser() {
    const courts = await fetchCourts();
    let html = '';
    courts.forEach(c => {
        html += `
        <div class="card">
            <div>
                <h4 style="margin:0;">${c.name}</h4>
                <small style="color:#666;">📍 ${c.location}</small><br>
                <b style="color:green;">Rp ${c.price.toLocaleString()} / jam</b>
            </div>
            <button class="btn btn-primary btn-small" onclick="showBookingForm('${c.id}', '${c.name}')">Booking ➝</button>
        </div>`;
    });
    document.getElementById('user-court-list').innerHTML = html;
}

function showBookingForm(courtId, courtName) {
    document.getElementById('user-view').classList.add('hidden');
    const contentDiv = document.getElementById('dynamic-content');
    
    // Render Form Booking
    contentDiv.innerHTML = `
        <div style="max-width:600px; margin:0 auto;">
            <button onclick="resetUserView()" class="btn btn-secondary btn-small" style="margin-bottom:15px;">⬅ Kembali</button>
            <h2 style="border-bottom:2px solid #eee; padding-bottom:10px;">📝 Booking: ${courtName}</h2>
            
            <div style="background:#f8f9fa; padding:20px; border-radius:8px;">
                <label style="font-weight:bold;">Tanggal:</label>
                <input type="date" id="book-date" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ddd; border-radius:5px;">
                
                <label style="font-weight:bold;">Jam:</label>
                <select id="book-time" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ddd; border-radius:5px;">
                     <option value="">-- Pilih Jam --</option>
                     <option value="08:00 - 09:00">08:00 - 09:00</option>
                     <option value="09:00 - 10:00">09:00 - 10:00</option>
                     <option value="10:00 - 11:00">10:00 - 11:00</option>
                     <option value="16:00 - 17:00">16:00 - 17:00</option>
                     <option value="19:00 - 20:00">19:00 - 20:00</option>
                     <option value="20:00 - 21:00">20:00 - 21:00</option>
                </select>

                <label style="font-weight:bold;">Nama:</label>
                <input type="text" id="book-name" value="${currentUser}" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ddd; border-radius:5px;">
                
                <label style="font-weight:bold;">No WA:</label>
                <input type="text" id="book-phone" placeholder="Contoh: 0812xxx" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:5px;">
            </div>
            
            <button onclick="submitBooking('${courtId}')" class="btn btn-success" style="margin-top:20px;">Konfirmasi ✅</button>
        </div>`;
}

function resetUserView() {
    document.getElementById('dynamic-content').innerHTML = '';
    document.getElementById('user-view').classList.remove('hidden');
}

async function submitBooking(courtId) {
    const date = document.getElementById('book-date').value;
    const time = document.getElementById('book-time').value;
    const name = document.getElementById('book-name').value;
    const phone = document.getElementById('book-phone').value;
    
    if(!date || !time || !name || !phone) return alert("Lengkapi data!");
    
    const userString = `${name} | HP: ${phone}`;
    const fullDate = `${date}, Jam ${time}`;
    
    const mutation = `mutation { createBooking(user: "${userString}", courtId: "${courtId}", date: "${fullDate}") { id } }`;
    
    try {
        await fetchGraphQL(BOOKING_API, mutation);
        alert("✅ Booking Berhasil!");
        resetUserView();
    } catch(err) { 
        alert("Gagal booking."); 
    }
}

// ==========================================
// BAGIAN 2: LOGIKA ADMIN (JADWAL, EDIT, HAPUS)
// ==========================================

async function loadCourtsForAdmin() {
    const courts = await fetchCourts();
    let html = '';
    courts.forEach(c => {
        html += `<div class="card" style="border-left:5px solid #fd7e14;">
            <div>
                <h4 style="margin:0;">${c.name}</h4>
                <small>${c.location}</small>
            </div>
            <button class="btn btn-warning btn-small" onclick="loadAdminSchedule('${c.id}', '${c.name}')">📂 Lihat Jadwal</button>
        </div>`;
    });
    document.getElementById('admin-court-list').innerHTML = html;
}

async function loadAdminSchedule(courtId, courtName) {
    currentAdminCourtId = courtId;
    document.getElementById('admin-view').classList.add('hidden');
    
    const contentDiv = document.getElementById('dynamic-content');
    contentDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3>📅 Jadwal: ${courtName}</h3>
            <div>
                <button onclick="refreshSchedule()" class="btn btn-secondary btn-small" style="margin-right:5px;">🔄 Refresh</button>
                <button onclick="resetAdminView()" class="btn btn-secondary btn-small">⬅ Kembali</button>
            </div>
        </div>
        <table id="admin-table">
            <thead>
                <tr>
                    <th>Penyewa & Kontak</th>
                    <th>Waktu Main</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody id="admin-tbody"><tr><td colspan="3">Loading...</td></tr></tbody>
        </table>`;
        
    refreshSchedule();
}

function resetAdminView() {
    document.getElementById('dynamic-content').innerHTML = '';
    document.getElementById('admin-view').classList.remove('hidden');
}

async function refreshSchedule() {
    const query = `query { bookings { id user date courtId } }`;
    const res = await fetchGraphQL(BOOKING_API, query);
    const bookings = res.data.bookings || [];
    const courtBookings = bookings.filter(b => b.courtId === currentAdminCourtId);
    
    const tbody = document.getElementById('admin-tbody');
    tbody.innerHTML = '';

    if(courtBookings.length === 0) {
        return tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">Belum ada booking.</td></tr>';
    }

    courtBookings.forEach(b => {
        tbody.innerHTML += `
        <tr>
            <td><b>${b.user}</b></td>
            <td>${b.date}</td>
            <td>
                <button class="btn btn-warning btn-small" style="width:auto; display:inline-block; margin-right:5px;" onclick="openEditModal('${b.id}')">Edit ✏️</button>
                <button class="btn btn-danger btn-small" style="width:auto; display:inline-block;" onclick="deleteItem('${b.id}')">Hapus 🗑️</button>
            </td>
        </tr>`;
    });
}

// --- FUNGSI HAPUS ---
async function deleteItem(id) {
    if(!confirm("Hapus booking ini?")) return;
    await fetchGraphQL(BOOKING_API, `mutation { deleteBooking(id: "${id}") }`);
    refreshSchedule();
}

// --- FUNGSI EDIT (MODAL) ---
function openEditModal(id) {
    document.getElementById('edit-booking-id').value = id;
    document.getElementById('admin-edit-modal').classList.remove('hidden');
}

function closeAdminEdit() {
    document.getElementById('admin-edit-modal').classList.add('hidden');
}

async function saveAdminEdit() {
    const id = document.getElementById('edit-booking-id').value;
    const date = document.getElementById('edit-date').value;
    const time = document.getElementById('edit-time').value;
    
    if(!date || !time) return alert("Pilih tanggal dan jam baru!");
    
    const fullDate = `${date}, Jam ${time}`;
    
    await fetchGraphQL(BOOKING_API, `mutation { updateBooking(id: "${id}", date: "${fullDate}") { id } }`);
    
    alert("✅ Jadwal Berhasil Diubah!");
    closeAdminEdit();
    refreshSchedule();
}

// --- HELPER FETCH COURTS ---
async function fetchCourts() {
    // COURT_API diambil dari auth.js (Global variable)
    const res = await fetchGraphQL(COURT_API, `query { courts { id name location price } }`);
    return res.data.courts || [];
}