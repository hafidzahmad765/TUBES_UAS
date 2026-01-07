const { ApolloServer, gql } = require('apollo-server');
const axios = require('axios');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const COURT_SERVICE_URL = 'http://padel-court:4000/';
const SECRET_KEY_USER = 'rahasia_user_booking'; 

const sequelize = new Sequelize('padel_db', 'root', 'rootpassword', {
  host: process.env.DB_HOST || 'localhost',
  dialect: 'mysql',
  logging: false
});

const Booking = sequelize.define('Booking', {
  user: { type: DataTypes.STRING },
  date: { type: DataTypes.STRING },
  courtId: { type: DataTypes.STRING }
});

const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: 'user' }
});

const typeDefs = gql`
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
  type User {
    id: ID!
    username: String!
    role: String!
  }
  type AuthPayload {
    token: String!
    user: User!
  }
  type Query {
    bookings: [Booking]
  }
  type Mutation {
    # Auth User Biasa
    register(username: String!, password: String!): User
    login(username: String!, password: String!): AuthPayload

    # Booking
    createBooking(user: String!, courtId: ID!, date: String!): Booking
    updateBooking(id: ID!, date: String!): Booking
    deleteBooking(id: ID!): Boolean 
  }
`;

const resolvers = {
  Booking: {
    courtDetails: async (parent) => {
      try {
        const query = `query { court(id: "${parent.courtId}") { name location price } }`;
        const res = await axios.post(COURT_SERVICE_URL, { query });
        return res.data.data.court;
      } catch (e) { return null; }
    }
  },
  Query: {
    bookings: async () => await Booking.findAll(),
  },
  Mutation: {
    register: async (_, { username, password }) => {
      const hashedPassword = await bcrypt.hash(password, 10);
      try {
        return await User.create({ username, password: hashedPassword, role: 'user' });
      } catch (err) { throw new Error("Username sudah dipakai."); }
    },
    login: async (_, { username, password }) => {
      const user = await User.findOne({ where: { username } });
      if (!user) throw new Error("User tidak ditemukan");
      
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error("Password salah");

      const token = jwt.sign({ id: user.id, username: user.username, role: 'user' }, SECRET_KEY_USER, { expiresIn: '2h' });
      return { token, user };
    },
    createBooking: async (_, { user, courtId, date }) => await Booking.create({ user, courtId, date }),
    updateBooking: async (_, { id, date }) => {
      await Booking.update({ date }, { where: { id } });
      return await Booking.findByPk(id);
    },
    deleteBooking: async (_, { id }) => (await Booking.destroy({ where: { id } })) > 0
  }
};

const server = new ApolloServer({ typeDefs, resolvers, cors: { origin: '*', credentials: true } });

const startServer = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync();
        console.log("✅ Booking Service Ready (User DB Ready)");
        
        const PORT = process.env.PORT || 4002; 
        
        server.listen({ port: PORT }).then(({ url }) => console.log(`🚀 Booking at ${url}`));
    } catch (e) { 
        console.error("Gagal start server, retry dalam 5 detik...", e);
        setTimeout(startServer, 5000); 
    }
};
startServer();