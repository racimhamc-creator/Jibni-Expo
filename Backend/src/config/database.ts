import mongoose from 'mongoose';

// MongoDB connection URI from environment (check both MONGO and MONGODB_URI)
const dbURI = process.env.MONGO || process.env.MONGODB_URI;

// Check if MongoDB URI is provided
if (!dbURI) {
  console.error('❌ MongoDB connection error: MONGO or MONGODB_URI environment variable is not set!');
  console.error('Please check your .env file and ensure MONGO or MONGODB_URI is defined.');
  console.error('Current env vars:', Object.keys(process.env).filter(key => key.includes('MONGO')));
  process.exit(1);
}

console.log('🔄 Attempting to connect to MongoDB...');
console.log(`📍 Connection string: ${dbURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')}`); // Hide password in logs

// Set up mongoose connection with options
const mongooseOptions = {
  serverSelectionTimeoutMS: 10000, // 10 seconds timeout
  socketTimeoutMS: 45000, // 45 seconds socket timeout
  connectTimeoutMS: 10000, // 10 seconds connection timeout
  retryWrites: true,
  retryReads: true,
};

// Connect to MongoDB (non-blocking - won't crash server if it fails)
mongoose.connect(dbURI, mongooseOptions)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🔗 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('💡 Please check:');
    console.error('   1. MongoDB server is running');
    console.error('   2. Connection string is correct');
    console.error('   3. Network connectivity');
    console.error('   4. MongoDB credentials are valid');
    console.error('   5. MongoDB Atlas IP whitelist includes your IP');
    console.warn('⚠️ Server will continue running but MongoDB features will not work until connection is established');
    // Don't exit - let server continue running
  });

// Mongoose connection event listeners
mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongoose disconnected from MongoDB');
});

// Handle process termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});

// Export the mongoose connection
export default mongoose;
