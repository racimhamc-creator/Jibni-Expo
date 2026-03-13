// Check Current Language Settings
import mongoose from 'mongoose';
import { User } from '../models/User.js';

const MONGODB_URI = 'mongodb+srv://jibni:Nabilop09!@clusterjibni.l7cwltq.mongodb.net/jibni?retryWrites=true&w=majority';

async function checkLanguageSettings() {
  try {
    console.log('🔍 Checking current language settings...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check driver 655854120
    const driverUser = await User.findOne({ phoneNumber: '655854120' });
    console.log(`📱 Driver 655854120:`, {
      _id: driverUser?._id,
      language: driverUser?.language,
      phoneNumber: driverUser?.phoneNumber
    });
    
    // Check client 6556589586
    const clientUser = await User.findOne({ phoneNumber: '6556589586' });
    console.log(`📱 Client 6556589586:`, {
      _id: clientUser?._id,
      language: clientUser?.language,
      phoneNumber: clientUser?.phoneNumber
    });
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkLanguageSettings();
