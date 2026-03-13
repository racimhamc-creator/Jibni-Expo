// Update Driver Language to French
import mongoose from 'mongoose';
import { User } from '../models/User.js';

const MONGODB_URI = 'mongodb+srv://jibni:Nabilop09!@clusterjibni.l7cwltq.mongodb.net/jibni?retryWrites=true&w=majority';

async function updateDriverToFrench() {
  try {
    console.log('🔄 Updating driver language to French...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Update driver 655854120 to French
    await User.findOneAndUpdate(
      { phoneNumber: '655854120' },
      { language: 'fr' }
    );
    console.log('🌍 Updated driver 655854120 to French');
    
    // Verify the update
    const driverUser = await User.findOne({ phoneNumber: '655854120' });
    console.log(`📱 Driver 655854120 now:`, {
      _id: driverUser?._id,
      language: driverUser?.language,
      phoneNumber: driverUser?.phoneNumber
    });
    
    console.log('✅ Driver language updated successfully!');
    
  } catch (error) {
    console.error('❌ Update failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

updateDriverToFrench();
