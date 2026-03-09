import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
} from 'react-native';
import { Star, Flag } from 'lucide-react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { api } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
  driverName?: string;
  driverId?: string;
  rideId?: string;
}

const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  onClose,
  onSubmit,
  driverName,
  driverId,
  rideId,
}) => {
  const { t, isRTL, fontFamily } = useLanguage();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const displayDriverName = driverName && driverName !== 'your driver' 
    ? driverName 
    : t('yourDriver');

  const reportReasons = [
    { key: 'rudeBehavior', en: 'Rude behavior', fr: 'Comportement grossier', ar: 'سلوك غير لائق' },
    { key: 'unsafeDriving', en: 'Unsafe driving', fr: 'Conduite dangereuse', ar: 'قيادة غير آمنة' },
    { key: 'wrongRoute', en: 'Wrong route', fr: 'Mauvais itinéraire', ar: 'مسار خاطئ' },
    { key: 'lateArrival', en: 'Late arrival', fr: 'Arrivée en retard', ar: 'تأخر في الوصول' },
    { key: 'vehicleCondition', en: 'Vehicle condition', fr: 'État du véhicule', ar: 'حالة السيارة' },
    { key: 'harassment', en: 'Harassment', fr: 'Harcèlement', ar: 'تحرش' },
    { key: 'other', en: 'Other', fr: 'Autre', ar: 'أخرى' },
  ];

  const getRatingLabel = () => {
    if (rating === 1) return t('poor');
    if (rating === 2) return t('fair');
    if (rating === 3) return t('good');
    if (rating === 4) return t('veryGood');
    if (rating === 5) return t('excellent');
    return t('tapToRate');
  };

  const getReasonText = (reasonKey: string) => {
    const reason = reportReasons.find(r => r.key === reasonKey);
    if (!reason) return reasonKey;
    return reason[isRTL ? 'ar' : 'en'] || reason.en;
  };

  const getReportReasonKey = () => {
    return reportReasons.map(r => r.key);
  };

  const handleStarPress = (star: number) => {
    setRating(star);
  };

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, comment);
      setRating(0);
      setComment('');
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    setShowReportModal(false);
    setSelectedReason('');
    setReportDescription('');
    onClose();
  };

  const handleReport = async () => {
    if (!selectedReason) {
      Alert.alert(t('error'), t('selectReasonError'));
      return;
    }

    if (!driverId) {
      Alert.alert(t('error'), t('cannotReport'));
      return;
    }

    setSubmittingReport(true);
    try {
      await api.submitReport({
        reportedId: driverId,
        rideId,
        reason: selectedReason,
        description: reportDescription,
        type: 'user',
      });
      Alert.alert(t('reportSubmitted'), t('thankYouFeedback'));
      setShowReportModal(false);
      setSelectedReason('');
      setReportDescription('');
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert(t('error'), t('reportFailed'));
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible && !showReportModal}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.overlay}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.container, isRTL && { alignItems: 'flex-end' }]}>
                {/* Success Icon */}
                <View style={styles.iconContainer}>
                  <View style={styles.successCircle}>
                    <Text style={styles.successIcon}>✓</Text>
                  </View>
                </View>

                {/* Title */}
                <Text style={[styles.title, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('rideCompleted')}
                </Text>
                <Text style={[styles.subtitle, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('howWasYourRide')} {displayDriverName}?
                </Text>

                {/* Star Rating */}
                <View style={[styles.starsContainer, isRTL && { flexDirection: 'row-reverse' }]}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => handleStarPress(star)}
                      onPressIn={() => setHoveredStar(star)}
                      onPressOut={() => setHoveredStar(0)}
                      style={styles.starButton}
                      activeOpacity={0.7}
                    >
                      <Star
                        size={40}
                        color={star <= (hoveredStar || rating) ? '#fbbf24' : '#3a3a3a'}
                        fill={star <= (hoveredStar || rating) ? '#fbbf24' : 'transparent'}
                        strokeWidth={star <= (hoveredStar || rating) ? 0 : 2}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Rating Label */}
                <Text style={[styles.ratingLabel, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
                  {getRatingLabel()}
                </Text>

                {/* Comment Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}
                    placeholder={t('addComment')}
                    placeholderTextColor="#666"
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>

                {/* Report Button */}
                {driverId && (
                  <TouchableOpacity
                    style={[styles.reportButton, isRTL && { flexDirection: 'row-reverse' }]}
                    onPress={() => setShowReportModal(true)}
                    activeOpacity={0.7}
                  >
                    <Flag size={16} color="#ef4444" />
                    <Text style={[styles.reportButtonText, { fontFamily }]}>{t('reportIssue')}</Text>
                  </TouchableOpacity>
                )}

                {/* Buttons */}
                <View style={[styles.buttonContainer, isRTL && { flexDirection: 'row-reverse' }]}>
                  <TouchableOpacity
                    style={styles.skipButton}
                    onPress={handleClose}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.skipButtonText, { fontFamily }]}>{t('skip')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      rating === 0 && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={rating === 0}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.submitButtonText, { fontFamily }]}>{t('submitRating')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.overlay}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.reportContainer, isRTL && { alignItems: 'flex-end' }]}>
                {/* Header */}
                <View style={[styles.reportHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                  <Flag size={28} color="#ef4444" />
                  <Text style={[styles.reportTitle, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('reportAnIssue')}
                  </Text>
                </View>
                <Text style={[styles.reportSubtitle, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('helpUsUnderstand')}
                </Text>

                {/* Reason Selection */}
                <Text style={[styles.reportLabel, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('selectReason')}
                </Text>
                <View style={[styles.reasonsContainer, isRTL && { justifyContent: 'flex-end' }]}>
                  {getReportReasonKey().map((reasonKey) => (
                    <TouchableOpacity
                      key={reasonKey}
                      style={[
                        styles.reasonButton,
                        selectedReason === reasonKey && styles.reasonButtonSelected,
                      ]}
                      onPress={() => setSelectedReason(reasonKey)}
                    >
                      <Text
                        style={[
                          styles.reasonButtonText,
                          { fontFamily, textAlign: 'center' },
                          selectedReason === reasonKey && styles.reasonButtonTextSelected,
                        ]}
                      >
                        {getReasonText(reasonKey)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Description */}
                <Text style={[styles.reportLabel, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('additionalDetails')}
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}
                    placeholder={t('describeWhatHappened')}
                    placeholderTextColor="#666"
                    value={reportDescription}
                    onChangeText={setReportDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Buttons */}
                <View style={[styles.buttonContainer, isRTL && { flexDirection: 'row-reverse' }]}>
                  <TouchableOpacity
                    style={styles.skipButton}
                    onPress={() => setShowReportModal(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.skipButtonText, { fontFamily }]}>{t('cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      styles.reportSubmitButton,
                      submittingReport && styles.submitButtonDisabled,
                    ]}
                    onPress={handleReport}
                    disabled={submittingReport || !selectedReason}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.submitButtonText, { fontFamily }]}>
                      {submittingReport ? t('submitting') : t('submitReport')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 40,
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 28,
    width: SCREEN_WIDTH - 40,
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  iconContainer: {
    marginBottom: 20,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    marginBottom: 24,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 20,
    height: 20,
  },
  inputContainer: {
    width: '100%',
    backgroundColor: '#252525',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 16,
  },
  input: {
    padding: 16,
    color: '#fff',
    fontSize: 14,
    minHeight: 80,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  reportButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#a0a0a0',
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#667eea',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#3a3a3a',
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Report Modal Styles
  reportContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 28,
    width: SCREEN_WIDTH - 40,
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  reportHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
  },
  reportLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a0a0a0',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  reasonButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  reasonButtonSelected: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  reasonButtonText: {
    color: '#a0a0a0',
    fontSize: 13,
    fontWeight: '500',
  },
  reasonButtonTextSelected: {
    color: '#fff',
  },
  reportSubmitButton: {
    backgroundColor: '#ef4444',
    flex: 2,
  },
  // RTL Styles
  containerRTL: {
    alignItems: 'flex-end',
  },
  starsContainerRTL: {
    flexDirection: 'row-reverse',
  },
  buttonContainerRTL: {
    flexDirection: 'row-reverse',
  },
  reportButtonRTL: {
    flexDirection: 'row-reverse',
  },
  reportContainerRTL: {
    alignItems: 'flex-end',
  },
  reportHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  reasonsContainerRTL: {
    justifyContent: 'flex-end',
  },
});

export default RatingModal;
