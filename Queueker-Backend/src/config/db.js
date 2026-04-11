const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
    try {
        let uri = process.env.MONGODB_URI;

        // If no external URI is provided, spin up an in-memory database!
        if (!uri || uri.includes('testuser:testpass123')) {
            const mongoServer = await MongoMemoryServer.create();
            uri = mongoServer.getUri();
            console.log('🌟 Started Local In-Memory MongoDB Server');
        }

        await mongoose.connect(uri);
        console.log(`✅ MongoDB connected: ${uri}`);
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;
