// Database Migration Script - Add Language Field to Existing Users
// Run this script to update existing users with default language preference

import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';

// MongoDB connection
const MONGODB_URI = process.env.MONGO || 'mongodb+srv://jibni:Nabilop09!@clusterjibni.l7cwltq.mongodb.net/jibni?retryWrites=true&w=majority';

async function migrateLanguageField() {
  try {
    console.log('🔄 Starting language field migration...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all users without language field
    const usersWithoutLanguage = await User.find({ 
      language: { $exists: false } 
    });
    
    console.log(`📊 Found ${usersWithoutLanguage.length} users without language field`);
    
    // Update each user with default language
    for (const user of usersWithoutLanguage) {
      // Check if user has a profile with language preference
      const profile = await Profile.findOne({ userId: user._id });
      const profileLanguage = profile?.language || 'en';
      
      // Update user with language from profile or default to English
      await User.findByIdAndUpdate(user._id, { 
        language: profileLanguage 
      });
      
      console.log(`🌍 Updated user ${user._id} (${user.phoneNumber}) language to: ${profileLanguage}`);
    }
    
    // Also update profiles that don't have language field
    const profilesWithoutLanguage = await Profile.find({ 
      language: { $exists: false } 
    });
    
    console.log(`📊 Found ${profilesWithoutLanguage.length} profiles without language field`);
    
    for (const profile of profilesWithoutLanguage) {
      await Profile.findByIdAndUpdate(profile._id, { 
        language: 'en' // Default to English
      });
      
      console.log(`🌍 Updated profile ${profile._id} language to: en`);
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Show statistics
    const totalUsers = await User.countDocuments();
    const usersWithLanguage = await User.countDocuments({ language: { $exists: true } });
    const arabicUsers = await User.countDocuments({ language: 'ar' });
    const frenchUsers = await User.countDocuments({ language: 'fr' });
    const englishUsers = await User.countDocuments({ language: 'en' });
    
    console.log('\n📈 Migration Statistics:');
    console.log(`Total users: ${totalUsers}`);
    console.log(`Users with language: ${usersWithLanguage}`);
    console.log(`Arabic users: ${arabicUsers}`);
    console.log(`French users: ${frenchUsers}`);
    console.log(`English users: ${englishUsers}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration immediately
migrateLanguageField();

export { migrateLanguageField };
