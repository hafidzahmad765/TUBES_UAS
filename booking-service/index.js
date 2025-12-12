const { ApolloServer, gql } = require('apollo-server');
const axios = require('axios');

const COURT_SERVICE_URL = 'http://court-service:4000/';

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

  type Query {
    bookings: [Booking]
    booking(id: ID!): Booking
  }

  type Mutation {
    createBooking(user: String!, courtId: ID!, date: String!): Booking
    # FITUR BARU: Edit Booking untuk Admin
    updateBooking(id: ID!, date: String!): Booking
  }
`;

let bookings = [];

const resolvers = {
  Booking: {
    courtDetails: async (parent) => {
      try {
        const query = `query { court(id: "${parent.courtId}") { name location price } }`;
        const response = await axios.post(COURT_SERVICE_URL, { query });
        return response.data.data.court;
      } catch (error) {
        return null;
      }
    }
  },
  Query: {
    bookings: () => bookings,
    booking: (_, { id }) => bookings.find(b => b.id === id)
  },
  Mutation: {
    createBooking: (_, { user, courtId, date }) => {
      const newBooking = { id: String(bookings.length + 1), user, courtId, date };
      bookings.push(newBooking);
      return newBooking;
    },
    // LOGIC EDIT DATA
    updateBooking: (_, { id, date }) => {
      const index = bookings.findIndex(b => b.id === id);
      if (index === -1) return null;
      bookings[index].date = date;
      return bookings[index];
    }
  }
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`🚀 Booking Service ready at ${url}`);
});