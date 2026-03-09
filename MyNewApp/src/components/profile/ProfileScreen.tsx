import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, Alert, ActivityIndicator, View, StyleSheet, Text, TextInput, Image, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { api } from '../../services/api';
import { storage } from '../../services/storage';

// Star Icon SVG
const StarIcon: React.FC<{ filled?: boolean; size?: number }> = ({ filled = false, size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#FEC846' : 'none'}>
    <Path
      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
      stroke="#FEC846"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={filled ? '#FEC846' : 'none'}
    />
  </Svg>
);

// Edit Icon
const EditIcon: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = '#185ADC' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface ProfileScreenProps {
  onBack: () => void;
  onLogout: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userData = await api.getCurrentUser();
        setUser(userData);
        setFirstName(userData.firstName || '');
        setLastName(userData.lastName || '');
        setPhoneNumber(userData.phoneNumber || '');
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  const rating = user?.rating || 0;
  const totalRatings = user?.totalRatings || 0;
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Not Set';

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updatedUser = await api.updateProfile({ 
        firstName, 
        lastName, 
        phoneNumber 
      });
      setUser(updatedUser);
      
      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
            await storage.clear();
            onLogout();
          },
        },
      ]
    );
  };

  if (isLoadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#185ADC" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {fullName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          </View>
          
          <Text style={styles.name}>{fullName}</Text>
          
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user?.role === 'driver' ? 'Driver' : 'Client'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Ratings Card (for drivers) */}
        {user?.role === 'driver' && rating > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ratings</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <View key={star} style={styles.star}>
                  <StarIcon filled={star <= Math.round(rating)} size={24} />
                </View>
              ))}
              <Text style={styles.ratingText}>
                {rating.toFixed(1)}
              </Text>
            </View>
            {totalRatings > 0 && (
              <Text style={styles.reviewsText}>
                {totalRatings} reviews
              </Text>
            )}
          </View>
        )}

        {/* Personal Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Personal Information</Text>
            {!isEditing && (
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                style={styles.editButton}
              >
                <EditIcon size={20} color="#185ADC" />
              </TouchableOpacity>
            )}
          </View>

          {/* Phone Number */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {phoneNumber || 'Not Set'}
              </Text>
            )}
          </View>

          {/* First Name */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>First Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                placeholder="First Name"
                value={firstName}
                onChangeText={setFirstName}
              />
            ) : (
              <Text style={styles.fieldValue}>
                {firstName || 'Not Set'}
              </Text>
            )}
          </View>

          {/* Last Name */}
          <View style={[styles.field, !isEditing && styles.fieldLast]}>
            <Text style={styles.fieldLabel}>Last Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
              />
            ) : (
              <Text style={styles.fieldValue}>
                {lastName || 'Not Set'}
              </Text>
            )}
          </View>

          {/* Edit Actions */}
          {isEditing && (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setIsEditing(false);
                  setFirstName(user?.firstName || '');
                  setLastName(user?.lastName || '');
                  setPhoneNumber(user?.phoneNumber || '');
                }}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Driver Information Card */}
        {user?.role === 'driver' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Driver Information</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Vehicle Type</Text>
              <Text style={styles.fieldValue}>
                {user?.vehicleType ? user.vehicleType.charAt(0).toUpperCase() + user.vehicleType.slice(1) : 'Not Set'}
              </Text>
            </View>
            
            <View style={styles.fieldLast}>
              <Text style={styles.fieldLabel}>Wilaya</Text>
              <Text style={styles.fieldValue}>
                {user?.wilaya || 'Not Set'}
              </Text>
            </View>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#185ADC',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 16,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'white',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 56,
    backgroundColor: '#E8EEFB',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  avatarText: {
    fontSize: 48,
    color: '#185ADC',
  },
  name: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  roleText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#E8EEFB',
  },
  field: {
    marginBottom: 20,
  },
  fieldLast: {
    marginBottom: 0,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  input: {
    fontSize: 16,
    color: '#000',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
  },
  editActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#185ADC',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  star: {
    marginRight: 4,
  },
  ratingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 12,
  },
  reviewsText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ProfileScreen;
