const { ApolloServer, gql } = require('apollo-server');
const axios = require('axios');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Konfigurasi URL Service Lain
const COURT_SERVICE_URL = 'http://padel-court:4000/';

// Kunci Rahasia untuk Token (Bisa diganti apa saja)
const SECRET_KEY = 'kuncirahasiapadel'; 

// --- 1. KONEKSI DATABASE ---
const sequelize = new Sequelize('padel_db', 'root', 'rootpassword', {
  host: process.env.DB_HOST || 'localhost',
  dialect: 'mysql',
  logging: false
});

// --- 2. MODEL DATABASE (Sequelize) ---

// Model Booking (Jadwal)
const Booking = sequelize.define('Booking', {
  user: { type: DataTypes.STRING }, // Format: "Nama | HP: 08xxx"
  date: { type: DataTypes.STRING }, // Format: "YYYY-MM-DD, Jam HH:MM - HH:MM"
  courtId: { type: DataTypes.STRING }
});

// Model User (Akun Login)
const User = sequelize.define('User', {
  username: { 
    type: DataTypes.STRING, 
    unique: true, 
    allowNull: false 
  },
  password: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  role: { 
    type: DataTypes.STRING, 
    defaultValue: 'user' // Default role adalah 'user'
  }
});

// --- 3. GRAPHQL SCHEMA (TypeDefs) ---
const typeDefs = gql`
  # Tipe Data Utama
  type Booking {
    id: ID!
    user: String!
    date: String!
    courtId: ID!
    courtDetails: CourtDetails 
  }

  type CourtDetails {
    name: String
    location: String
    price: Int
  }
  
  # Tipe Data User & Token
  type User {
    id: ID!
    username: String!
    role: String!
  }
  
  type AuthPayload {
    token: String!
    user: User!
  }

  # Query (Ambil Data)
  type Query {
    bookings: [Booking]
  }

  # Mutation (Ubah Data: Register, Login, Booking)
  type Mutation {
    # --- FITUR AUTH (LOGIN & REGISTER) ---
    register(username: String!, password: String!): User
    login(username: String!, password: String!): AuthPayload

    # --- FITUR BOOKING ---
    createBooking(user: String!, courtId: ID!, date: String!): Booking
    updateBooking(id: ID!, date: String!): Booking
    deleteBooking(id: ID!): Boolean 
  }
`;

// --- 4. RESOLVERS (Logika) ---
const resolvers = {
  Booking: {
    // Resolver untuk mengambil detail lapangan dari Court Service
    courtDetails: async (parent) => {
      try {
        const query = `query { court(id: "${parent.courtId}") { name location price } }`;
        const response = await axios.post(COURT_SERVICE_URL, { query });
        if(response.data.errors) return null;
        return response.data.data.court;
      } catch (error) { 
        console.error("Gagal ambil detail lapangan:", error.message);
        return null; 
      }
    }
  },

  Query: {
    bookings: async () => await Booking.findAll(),
  },

  Mutation: {
    // --- LOGIKA REGISTER ---
    register: async (_, { username, password }) => {
      // 1. Tentukan Role (Jika username 'admin', jadi admin)
      const role = username.toLowerCase() === 'admin' ? 'admin' : 'user';
      
      // 2. Enkripsi Password (Hash)
      const hashedPassword = await bcrypt.hash(password, 10);
      
      try {
        // 3. Simpan ke Database MySQL
        const newUser = await User.create({ 
            username, 
            password: hashedPassword, 
            role 
        });
        return newUser;
      } catch (err) {
        throw new Error("Username sudah dipakai atau terjadi kesalahan database.");
      }
    },

    // --- LOGIKA LOGIN ---
    login: async (_, { username, password }) => {
      // 1. Cari User di Database
      const user = await User.findOne({ where: { username } });
      if (!user) throw new Error("User tidak ditemukan");

      // 2. Cek Password (Bandingkan input dengan hash di DB)
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error("Password salah");

      // 3. Buat Token (JWT)
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role }, 
        SECRET_KEY, 
        { expiresIn: '2h' } // Token berlaku 2 jam
      );

      // 4. Kembalikan Token & Data User
      return { token, user };
    },

    // --- LOGIKA BOOKING ---
    createBooking: async (_, { user, courtId, date }) => {
      return await Booking.create({ user, courtId, date });
    },
    
    updateBooking: async (_, { id, date }) => {
      await Booking.update({ date }, { where: { id } });
      return await Booking.findByPk(id);
    },
    
    deleteBooking: async (_, { id }) => {
      const result = await Booking.destroy({ where: { id } });
      return result > 0; // Return true jika berhasil dihapus
    }
  }
};

// --- 5. JALANKAN SERVER ---
const server = new ApolloServer({ 
    typeDefs, 
    resolvers,
    cors: {
        origin: '*',
        credentials: true
    }
});

const startServer = async () => {
    try {
        // Cek Koneksi & Sinkronisasi Tabel (Buat tabel jika belum ada)
        await sequelize.authenticate();
        await sequelize.sync(); 
        
        console.log("✅ MySQL Connected & Models Synced!");
        
        server.listen({ port: 4000 }).then(({ url }) => {
            console.log(`🚀 Booking Service ready at ${url}`);
        });
    } catch (err) {
        console.error("❌ Database Connection Error:", err.message);
        // Coba koneksi ulang dalam 5 detik jika gagal
        setTimeout(startServer, 5000);
    }
};

startServer();