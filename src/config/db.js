// Cached Mongoose connection. Serverless functions re-run this file often, so we
// keep the connection promise on `global` to avoid exhausting Atlas connections.
const mongoose = require("mongoose");
const env = require("./env");

const dns=require("dns");
dns.setServers(["1.1.1.1","8.8.8.8"]);

let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    mongoose.set("strictQuery", true);
    cached.promise = mongoose
      .connect(env.MONGODB_URI, { bufferCommands: false, serverSelectionTimeoutMS: 8000 })
      .then((m) => m);
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // allow retry on next request
    throw err;
  }
  return cached.conn;
}

module.exports = { connectDB };
