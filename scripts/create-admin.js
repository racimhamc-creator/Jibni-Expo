#!/usr/bin/env node

/**
 * Create Admin Account Script
 * Usage: node scripts/create-admin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Admin user details
const ADMIN_EMAIL = 'securekds2@gmail.com';
const ADMIN_PASSWORD = 'Nabilop09!';
const ADMIN_NAME = 'Admin User';
const ADMIN_ROLE = 'admin';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jibni';

async function createAdmin() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get User model (adjust path as needed)
    const User = mongoose.model('User') || require('../src/models/User');

    // Check if admin already exists
    console.log('🔍 Checking if admin account already exists...');
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    
    if (existingAdmin) {
      console.log('⚠️  Admin account already exists!');
      console.log(`📧 Email: ${existingAdmin.email}`);
      console.log(`👤 Role: ${existingAdmin.role}`);
      console.log(`🆔 ID: ${existingAdmin._id}`);
      
      // Update password if needed
      const isPasswordMatch = await bcrypt.compare(ADMIN_PASSWORD, existingAdmin.password);
      if (!isPasswordMatch) {
        console.log('🔑 Updating admin password...');
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        await User.updateOne(
          { _id: existingAdmin._id },
          { $set: { password: hashedPassword } }
        );
        console.log('✅ Admin password updated successfully!');
      }
      
      await mongoose.disconnect();
      return;
    }

    // Hash the password
    console.log('🔑 Hashing admin password...');
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Create admin user
    console.log('👤 Creating admin account...');
    const adminUser = new User({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: ADMIN_ROLE,
      isApproved: true, // Auto-approve admin
      banned: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await adminUser.save();
    console.log('✅ Admin account created successfully!');
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`👤 Role: ${ADMIN_ROLE}`);
    console.log(`🆔 ID: ${adminUser._id}`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error creating admin account:', error.message);
    process.exit(1);
  }
}

// Run the script
createAdmin();
