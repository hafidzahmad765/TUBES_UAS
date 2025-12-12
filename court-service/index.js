const { ApolloServer, gql } = require('apollo-server');

// Schema GraphQL
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


const courts = [
  { 
    id: "1", 
    name: "Padel Pro Dago", 
    location: "Jl. Dago Atas, Bandung", 
    price: 150000 
  },
  { 
    id: "2", 
    name: "Bubat Padel Center", 
    location: "Buah Batu, Bandung", 
    price: 125000 
  },
  { 
    id: "3", 
    name: "Ciumbuleuit VIP Court", 
    location: "Ciumbuleuit, Bandung", 
    price: 200000 
  },
  { 
    id: "4", 
    name: "Telkom University Court", 
    location: "Dayeuhkolot, Kab. Bandung", 
    price: 100000 
  }
];


const resolvers = {
  Query: {
    courts: () => courts,
    court: (_, { id }) => courts.find(court => court.id === id),
  },
};


const server = new ApolloServer({ typeDefs, resolvers });

server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`🚀 Court Service (Bandung Area) ready at ${url}`);
});