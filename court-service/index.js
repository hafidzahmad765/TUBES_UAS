const { ApolloServer, gql } = require('apollo-server');
const { Sequelize, DataTypes } = require('sequelize');

// 1. KONEKSI MYSQL (Tunggu beberapa detik agar MySQL siap)
const sequelize = new Sequelize('padel_db', 'root', 'rootpassword', {
  host: process.env.DB_HOST || 'localhost',
  dialect: 'mysql',
  logging: false
});

// 2. MODEL DATABASE (Tabel Courts)
const Court = sequelize.define('Court', {
  name: { type: DataTypes.STRING, allowNull: false },
  location: { type: DataTypes.STRING },
  price: { type: DataTypes.INTEGER }
});

// 3. GRAPHQL SCHEMA
const typeDefs = gql`
  type Court {
    id: ID!
    name: String!
    location: String!
    price: Int!
  }

  type Query {
    courts: [Court]
    court(id: ID!): Court
  }
`;

// 4. RESOLVERS
const resolvers = {
  Query: {
    courts: async () => await Court.findAll(),
    court: async (_, { id }) => await Court.findByPk(id),
  },
};

// 5. SERVER SETUP & SEEDING
const server = new ApolloServer({ typeDefs, resolvers, cors: { origin: '*', credentials: true } });

const startServer = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync(); // Buat tabel jika belum ada
        console.log("✅ Terkoneksi ke MySQL!");

        // Auto Seeding
        const count = await Court.count();
        if (count === 0) {
            await Court.bulkCreate([
                { name: "Padel Pro Dago", location: "Jl. Dago Atas, Bandung", price: 150000 },
                { name: "Bubat Padel Center", location: "Buah Batu, Bandung", price: 125000 },
                { name: "Ciumbuleuit VIP Court", location: "Ciumbuleuit, Bandung", price: 200000 },
                { name: "Telkom University Court", location: "Dayeuhkolot", price: 100000 }
            ]);
            console.log("🌱 Data Dummy Lapangan Ditambahkan.");
        }

        server.listen({ port: 4000 }).then(({ url }) => {
            console.log(`🚀 Court Service ready at ${url}`);
        });

    } catch (err) {
        console.error("❌ Gagal connect database:", err);
        // Retry logic sederhana jika DB belum siap saat container naik
        setTimeout(startServer, 5000);
    }
};

startServer();