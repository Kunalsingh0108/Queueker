const mongoose = require('mongoose');
const Queue = require('./src/models/Queue');
const connectDB = require('./src/config/db');

async function test() {
    await connectDB();
    try {
        const queue = await Queue.create({
            _id: 'XBZ4P9',
            name: 'Test',
            domain: 'test',
            serviceType: 'test',
            adminId: new mongoose.Types.ObjectId()
        });
        console.log('Success', queue);
    } catch (err) {
        console.error('Error!', err);
    }
    process.exit(0);
}

test();
