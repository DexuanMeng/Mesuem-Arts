/**
 * Main Scanner Screen - One-Handed Use
 * Premium Museum Quality UX
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../../src/theme';
import ResultCard from '../../src/components/ResultCard';

const { width } = Dimensions.get('window');

// TODO: Replace with your backend API URL
const API_BASE_URL = 'http://10.10.20.248:8000'; // For development - your computer's IP
// const API_BASE_URL = 'https://your-backend.onrender.com'; // For production

interface ScanResult {
  status: 'match_found' | 'verified_result' | 'community_result' | 'ai_analysis' | 'not_art';
  artwork?: {
    id: number;
    title: string;
    artist: string;
    description: any;
    image_url: string;
    similarity?: number;
    is_verified?: boolean;
    source?: string;
    confidence_score?: number;
    confidence?: string;
  };
  analysis?: string;
  message?: string;
  ai_generated: boolean;
  badge?: string;
  cataloged?: boolean;
}

export default function ScanScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Reticle animation
  const reticleOpacity = useSharedValue(0.6);
  const reticleScale = useSharedValue(1);

  useEffect(() => {
    // Request location permission on mount
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    })();

    // Start reticle pulse animation
    reticleOpacity.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    reticleScale.value = withRepeat(
      withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const reticleAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: reticleOpacity.value,
      transform: [{ scale: reticleScale.value }],
    };
  });

  const handleScan = async () => {
    if (!cameraRef.current || !permission?.granted) {
      Alert.alert('Permission Required', 'Camera permission is required to scan artworks.');
      return;
    }

    if (locationPermission === false) {
      Alert.alert('Location Required', 'Location permission is required for accurate results.');
      return;
    }

    // Haptic feedback on press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    setIsScanning(true);

    try {
      // Take picture
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      // Get location
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Prepare form data
      const formData = new FormData();
      formData.append('image', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'artwork.jpg',
      } as any);
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
      formData.append('user_id', 'anonymous'); // TODO: Get from auth context

      // Send to backend
      const response = await fetch(`${API_BASE_URL}/scan`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data: ScanResult = await response.json();
      setResult(data);
      setShowResult(true);

      // Haptic feedback on success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert(
        'Scan Failed',
        error instanceof Error ? error.message : 'Failed to scan artwork. Please try again.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleReportIssue = async (artworkId: number) => {
    Alert.alert(
      'Report Issue',
      'What is wrong with this artwork information?',
      [
        {
          text: 'Wrong Title',
          onPress: () => submitReport(artworkId, 'wrong_title'),
        },
        {
          text: 'Wrong Artist',
          onPress: () => submitReport(artworkId, 'wrong_artist'),
        },
        {
          text: 'Not an Artwork',
          onPress: () => submitReport(artworkId, 'not_artwork'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const submitReport = async (artworkId: number, issueType: string) => {
    try {
      const formData = new FormData();
      formData.append('artwork_id', artworkId.toString());
      formData.append('user_id', 'anonymous');
      formData.append('issue_type', issueType);
      formData.append('description', '');

      const response = await fetch(`${API_BASE_URL}/report-issue`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        Alert.alert('Thank You', 'Your report has been submitted. We will review it.');
      } else {
        Alert.alert('Error', 'Failed to submit report. Please try again.');
      }
    } catch (error) {
      console.error('Report error:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionContent}>
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionText}>
              We need camera access to scan artworks and unlock their stories.
            </Text>
            <TouchableWithoutFeedback onPress={requestPermission}>
              <View style={styles.permissionButton}>
                <Text style={styles.permissionButtonText}>Enable Camera</Text>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode="picture"
      >
        {/* Entire camera view is clickable for one-handed use */}
        <TouchableWithoutFeedback onPress={handleScan} disabled={isScanning}>
          <View style={styles.cameraTouchArea}>
            {/* Reticle - Pulsing corner brackets */}
            <Animated.View style={[styles.reticle, reticleAnimatedStyle]}>
              {/* Top Left Corner */}
              <View style={styles.reticleCornerTopLeft}>
                <View style={[styles.reticleLine, { top: 0, left: 0, width: 30, height: 2 }]} />
                <View style={[styles.reticleLine, { top: 0, left: 0, width: 2, height: 30 }]} />
              </View>
              {/* Top Right Corner */}
              <View style={styles.reticleCornerTopRight}>
                <View style={[styles.reticleLine, { top: 0, right: 0, width: 30, height: 2 }]} />
                <View style={[styles.reticleLine, { top: 0, right: 0, width: 2, height: 30 }]} />
              </View>
              {/* Bottom Left Corner */}
              <View style={styles.reticleCornerBottomLeft}>
                <View style={[styles.reticleLine, { bottom: 0, left: 0, width: 30, height: 2 }]} />
                <View style={[styles.reticleLine, { bottom: 0, left: 0, width: 2, height: 30 }]} />
              </View>
              {/* Bottom Right Corner */}
              <View style={styles.reticleCornerBottomRight}>
                <View style={[styles.reticleLine, { bottom: 0, right: 0, width: 30, height: 2 }]} />
                <View style={[styles.reticleLine, { bottom: 0, right: 0, width: 2, height: 30 }]} />
              </View>
            </Animated.View>

            {/* Loading overlay */}
            {isScanning && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Scanning...</Text>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </CameraView>

      {/* Result Card */}
      {result && result.artwork && (
        <ResultCard
          visible={showResult}
          onClose={() => {
            setShowResult(false);
            setResult(null);
          }}
          artwork={result.artwork}
          similarity={result.artwork.similarity}
          onReportIssue={
            !result.artwork.is_verified ? handleReportIssue : undefined
          }
        />
      )}

      {/* Not Art Modal */}
      {result && result.status === 'not_art' && (
        <Modal
          visible={showResult}
          animationType="fade"
          transparent={true}
          onRequestClose={() => {
            setShowResult(false);
            setResult(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Not an Artwork</Text>
              <Text style={styles.modalText}>{result.message}</Text>
              <TouchableWithoutFeedback
                onPress={() => {
                  setShowResult(false);
                  setResult(null);
                }}
              >
                <View style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>OK</Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  camera: {
    flex: 1,
  },
  cameraTouchArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticle: {
    width: 200,
    height: 200,
    position: 'absolute',
  },
  reticleCornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
  },
  reticleCornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
  },
  reticleCornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
  },
  reticleCornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
  },
  reticleLine: {
    position: 'absolute',
    backgroundColor: colors.primary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionContent: {
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
});
