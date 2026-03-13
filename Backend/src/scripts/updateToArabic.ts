// Update Specific Users to Arabic
import mongoose from 'mongoose';
import { User } from '../models/User.js';

const MONGODB_URI = 'mongodb+srv://jibni:Nabilop09!@clusterjibni.l7cwltq.mongodb.net/jibni?retryWrites=true&w=majority';

async function updateUsersToArabic() {
  try {
    console.log('🔄 Updating specific users to Arabic...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Update driver (655854120) to Arabic
    await User.findOneAndUpdate(
      { phoneNumber: '655854120' },
      { language: 'ar' }
    );
    console.log('🌍 Updated driver 655854120 to Arabic');
    
    // Update client (578548857) to Arabic  
    await User.findOneAndUpdate(
      { phoneNumber: '578548857' },
      { language: 'ar' }
    );
    console.log('🌍 Updated client 578548857 to Arabic');
    
    console.log('✅ Users updated to Arabic successfully!');
    
  } catch (error) {
    console.error('❌ Update failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

updateUsersToArabic();
