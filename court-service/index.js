const { ApolloServer, gql } = require('apollo-server');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET_KEY_ADMIN = 'rahasia_admin_court';

// 1. KONEKSI MYSQL
const sequelize = new Sequelize('padel_db', 'root', 'rootpassword', {
  host: process.env.DB_HOST || 'localhost',
  dialect: 'mysql',
  logging: false
});

// 2. MODEL DATABASE
// Model Court (Lapangan)
const Court = sequelize.define('Court', {
  name: { type: DataTypes.STRING, allowNull: false },
  location: { type: DataTypes.STRING },
  price: { type: DataTypes.INTEGER }
});

// Model Admin (BARU: Khusus Admin disimpan di sini)
const Admin = sequelize.define('Admin', {
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: 'admin' }
});

// 3. GRAPHQL SCHEMA
const typeDefs = gql`
  type Court {
    id: ID!
    name: String!
    location: String!
    price: Int!
  }

  type Admin {
    id: ID!
    username: String!
    role: String!
  }

  type AuthPayload {
    token: String!
    user: Admin!
  }

  type Query {
    courts: [Court]
    court(id: ID!): Court
  }

  type Mutation {
    # Fitur Auth Khusus Admin
    registerAdmin(username: String!, password: String!): Admin
    loginAdmin(username: String!, password: String!): AuthPayload
  }
`;

// 4. RESOLVERS
const resolvers = {
  Query: {
    courts: async () => await Court.findAll(),
    court: async (_, { id }) => await Court.findByPk(id),
  },
  Mutation: {
    // Register Admin
    registerAdmin: async (_, { username, password }) => {
      const hashedPassword = await bcrypt.hash(password, 10);
      try {
        return await Admin.create({ username, password: hashedPassword, role: 'admin' });
      } catch (err) { throw new Error("Username Admin sudah ada"); }
    },
    // Login Admin
    loginAdmin: async (_, { username, password }) => {
      const admin = await Admin.findOne({ where: { username } });
      if (!admin) throw new Error("Admin tidak ditemukan");

      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) throw new Error("Password salah");

      const token = jwt.sign(
        { id: admin.id, username: admin.username, role: 'admin' }, 
        SECRET_KEY_ADMIN, { expiresIn: '2h' }
      );
      return { token, user: admin };
    }
  }
};

// 5. SERVER SETUP
const server = new ApolloServer({ typeDefs, resolvers, cors: { origin: '*', credentials: true } });

const startServer = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync(); 
        console.log("✅ Court Service Connected (Admin DB Ready)!");

        // Auto Seeding Courts
        if ((await Court.count()) === 0) {
            await Court.bulkCreate([
                { name: "Padel Pro Dago", location: "Jl. Dago Atas", price: 150000 },
                { name: "Bubat Padel Center", location: "Buah Batu", price: 125000 },
                { name: "Ciumbuleuit VIP", location: "Ciumbuleuit", price: 200000 },
                { name: "Telkom Court", location: "Dayeuhkolot", price: 100000 }
            ]);
        }

        // Auto Seeding Admin (admin/admin)
        const adminExists = await Admin.findOne({ where: { username: 'admin' } });
        if (!adminExists) {
            const hash = await bcrypt.hash('admin', 10);
            await Admin.create({ username: 'admin', password: hash });
            console.log("⚙️ Akun Admin Default Dibuat: admin/admin");
        }

        server.listen({ port: 4000 }).then(({ url }) => {
            console.log(`🚀 Court Service ready at ${url}`);
        });
    } catch (err) {
        console.error("Error:", err);
        setTimeout(startServer, 5000);
    }
};

startServer();