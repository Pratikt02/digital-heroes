// Local development entry. On Vercel, api/index.js is used instead.
const app = require("./app");
const env = require("./config/env");
const { connectDB } = require("./config/db");

connectDB()
  .then(() => app.listen(env.PORT, () => console.log(`API running on http://localhost:${env.PORT}`)))
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
