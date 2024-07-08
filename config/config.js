module.exports = {
  db: {
    uri: process.env.MONGO_URI,
  },
  jwtSecret: process.env.JWT_SECRET,
  dhlApiKey: process.env.DHL_API_KEY,
  apiServerPort: process.env.API_SERVER_PORT || 3000,
};