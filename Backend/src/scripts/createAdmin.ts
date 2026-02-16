#!/usr/bin/env node
/**
 * Admin Account Creation Script
 * 
 * Usage:
 *   npx tsx src/scripts/createAdmin.ts +213XXXXXXXXX [password]
 *   
 * If password is not provided, defaults to 'admin123'
 */

import 'dotenv/config';
import '../config/database.js';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

const createAdmin = async (phoneNumber: string, password: string = 'admin123') => {
  try {
    console.log('🔧 Creating admin account...');
    console.log(`📱 Phone: ${phoneNumber}`);
    console.log(`🔑 Password: ${password}`);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user already exists
    let user = await User.findOne({ phoneNumber });
    
    if (user) {
      console.log('⚠️  User already exists, updating to admin...');
      user.role = 'admin';
      user.isVerified = true;
      user.password = hashedPassword;
      await user.save();
    } else {
      // Create new admin user
      user = new User({
        phoneNumber,
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        isDriverRequested: false,
      });
      await user.save();
      console.log('✅ Admin user created');
    }

    // Note: Admins don't need a profile since they're backend-only users
    // Profile is only needed for clients and drivers with app-facing features
    console.log('ℹ️  Skipping profile creation (admins don\'t need profiles)');

    console.log('\n🎉 Admin account ready!');
    console.log(`📱 Login: ${phoneNumber}`);
    console.log(`🔑 Password: ${password}`);
    console.log('\n⚠️  IMPORTANT: Change the default password after first login!');
    console.log('----------------------------------------');
    console.log('User ID:', user._id.toString());
    console.log('Role:', user.role);
    console.log('----------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
};

// Get phone number from command line
const phoneNumber = process.argv[2];
const password = process.argv[3];

if (!phoneNumber) {
  console.log('Usage: npx tsx src/scripts/createAdmin.ts +213XXXXXXXXX [password]');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx src/scripts/createAdmin.ts +213555123456');
  console.log('  npx tsx src/scripts/createAdmin.ts +213555123456 mypassword');
  console.log('');
  console.log('Default password: admin123');
  process.exit(1);
}

// Validate phone number format
if (!phoneNumber.match(/^\+213[0-9]{9}$/)) {
  console.error('❌ Invalid phone number format. Use: +213XXXXXXXXX (9 digits)');
  process.exit(1);
}

createAdmin(phoneNumber, password);
