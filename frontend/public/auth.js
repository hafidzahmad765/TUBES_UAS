// --- KONFIGURASI API ---
const COURT_API = 'http://localhost:4001';
const BOOKING_API = 'http://localhost:4002';

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
        showDashboard(); // Langsung ke dashboard
    } else {
        // Biarkan di halaman login
    }
}

// --- NAVIGASI AUTH UI ---
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
    
    // Panggil fungsi init dashboard di script.js
    initDashboard(currentUser, currentRole);
}

// --- FUNGSI REGISTER (API) ---
async function register() {
    const userIn = document.getElementById('reg-username').value.trim();
    const passIn = document.getElementById('reg-password').value.trim();

    if(!userIn || !passIn) return alert("Username dan Password wajib diisi!");

    // Mutation Register (Role otomatis 'user' di backend)
    const mutation = `mutation { register(username: "${userIn}", password: "${passIn}") { id username } }`;

    try {
        const res = await fetchGraphQL(BOOKING_API, mutation);
        
        if (res.errors) {
            alert("Gagal Register: " + res.errors[0].message);
        } else {
            alert("✅ Registrasi Berhasil! Silakan Login.");
            // Bersihkan form
            document.getElementById('reg-username').value = '';
            document.getElementById('reg-password').value = '';
            // Pindah ke Login
            switchToLogin();
        }
    } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan server backend.");
    }
}

// --- FUNGSI LOGIN (API) ---
async function login() {
    const userIn = document.getElementById('login-username').value.trim();
    const passIn = document.getElementById('login-password').value.trim();

    if(!userIn || !passIn) return alert("Isi username dan password!");

    const mutation = `mutation { login(username: "${userIn}", password: "${passIn}") { token user { username role } } }`;

    try {
        const res = await fetchGraphQL(BOOKING_API, mutation);

        if (res.errors) {
            alert("Login Gagal: " + res.errors[0].message);
        } else {
            const data = res.data.login;
            
            // Simpan Token
            authToken = data.token;
            currentUser = data.user.username;
            currentRole = data.user.role;

            localStorage.setItem('padelToken', authToken);
            localStorage.setItem('padelUser', currentUser);
            localStorage.setItem('padelRole', currentRole);

            // Masuk Dashboard
            showDashboard();
        }
    } catch (err) {
        console.error(err);
        alert("Gagal koneksi ke server.");
    }
}

function logout() {
    localStorage.clear();
    location.reload();
}

// --- HELPER FETCH ---
async function fetchGraphQL(url, query) {
    const headers = { 'Content-Type': 'application/json' };
    if(authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(url, {
        method: 'POST', 
        headers: headers,
        body: JSON.stringify({ query })
    });
    return await res.json();
}