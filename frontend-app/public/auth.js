// --- KONFIGURASI API ---
const API_GATEWAY = 'http://localhost:3000';

const COURT_API = `${API_GATEWAY}/court-api`;   // Akan diproxy ke port 4001
const BOOKING_API = `${API_GATEWAY}/booking-api`; // Akan diproxy ke port 4002

let authToken = '';
let currentUser = '';
let currentRole = '';

// --- CEK SESI SAAT LOAD ---
window.onload = function() {
    const storedToken = localStorage.getItem('padelToken');
    const storedUser = localStorage.getItem('padelUser');
    const storedRole = localStorage.getItem('padelRole');

    if(storedToken && storedUser) {
        authToken = storedToken;
        currentUser = storedUser;
        currentRole = storedRole;
        showDashboard();
    }
}

// --- NAVIGASI UI ---
function switchToRegister() {
    document.getElementById('login-card').classList.add('hidden');
    document.getElementById('register-card').classList.remove('hidden');
}
function switchToLogin() {
    document.getElementById('register-card').classList.add('hidden');
    document.getElementById('login-card').classList.remove('hidden');
}
function showDashboard() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
    // Panggil fungsi initDashboard yang ada di script.js
    if(typeof initDashboard === "function") {
        initDashboard(currentUser, currentRole);
    }
}

// --- FUNGSI REGISTER ---
async function register() {
    const userIn = document.getElementById('reg-username').value.trim();
    const passIn = document.getElementById('reg-password').value.trim();
    if(!userIn || !passIn) return alert("Isi data lengkap!");

    let apiURL = BOOKING_API;
    let mutation = `mutation { register(username: "${userIn}", password: "${passIn}") { id username } }`;

    // LOGIKA SPESIAL: Jika username 'admin', daftar ke Court Service
    if(userIn.toLowerCase() === 'admin') {
        apiURL = COURT_API;
        mutation = `mutation { registerAdmin(username: "${userIn}", password: "${passIn}") { id username } }`;
    }

    try {
        const res = await fetchGraphQL(apiURL, mutation);
        if (res.errors) alert("Gagal: " + res.errors[0].message);
        else {
            alert("✅ Registrasi Berhasil!");
            switchToLogin();
        }
    } catch (err) { alert("Error Server"); }
}

// --- FUNGSI LOGIN (ROUTING OTOMATIS) ---
async function login() {
    const userIn = document.getElementById('login-username').value.trim();
    const passIn = document.getElementById('login-password').value.trim();
    if(!userIn || !passIn) return alert("Isi username & password!");

    let apiURL = BOOKING_API; // Default ke User (Booking Service)
    let mutation = `mutation { login(username: "${userIn}", password: "${passIn}") { token user { username role } } }`;

    // JIKA ADMIN -> LOGIN KE COURT SERVICE
    if(userIn.toLowerCase() === 'admin') {
        apiURL = COURT_API;
        mutation = `mutation { loginAdmin(username: "${userIn}", password: "${passIn}") { token user { username role } } }`;
    }

    try {
        const res = await fetchGraphQL(apiURL, mutation);
        if (res.errors) {
            alert("Login Gagal: " + res.errors[0].message);
        } else {
            // Deteksi respon admin vs user
            const data = res.data.login || res.data.loginAdmin;
            
            authToken = data.token;
            currentUser = data.user.username;
            currentRole = data.user.role;

            localStorage.setItem('padelToken', authToken);
            localStorage.setItem('padelUser', currentUser);
            localStorage.setItem('padelRole', currentRole);

            showDashboard();
        }
    } catch (err) { alert("Gagal koneksi ke server."); }
}

function logout() { localStorage.clear(); location.reload(); }

async function fetchGraphQL(url, query) {
    const headers = { 'Content-Type': 'application/json' };
    if(authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ query }) });
    return await res.json();
}