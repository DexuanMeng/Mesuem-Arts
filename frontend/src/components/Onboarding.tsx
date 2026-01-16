/**
 * Onboarding Flow - 4 Screen Swiper
 * Museum Quality UX
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography } from '../theme';
import ResultCard from './ResultCard';

const { width, height } = Dimensions.get('window');

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isSimulating, setIsSimulating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const pagerRef = useRef<PagerView>(null);

  const handleNext = () => {
    if (pagerRef.current) {
      const nextPage = currentPage + 1;
      if (nextPage < 4) {
        pagerRef.current.setPage(nextPage);
        setCurrentPage(nextPage);
      }
    }
  };

  const handleCameraPermission = async () => {
    const { status } = await requestCameraPermission();
    if (status === 'granted') {
      handleNext();
    }
  };

  const handleSimulateScan = async () => {
    setIsSimulating(true);
    
    // Simulate loading (1.5s)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSimulating(false);
    setShowResult(true);
  };

  const handleEnterMuseum = async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    onComplete();
  };

  return (
    <>
      <View style={styles.container}>
        <PagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={0}
          onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
        >
          {/* Screen 1: Hook */}
          <View key="1" style={styles.page}>
            <View style={styles.content}>
              <Image
                source={{
                  uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/1200px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
                }}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <View style={styles.textContainer}>
                <Text style={styles.headline}>Every Artwork has a Secret.</Text>
                <Text style={styles.subtitle}>
                  Unlock hidden stories and audio guides.
                </Text>
              </View>
              <TouchableOpacity style={styles.button} onPress={handleNext}>
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Screen 2: Permissions */}
          <View key="2" style={styles.page}>
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>📷</Text>
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.headline}>We need eyes to see.</Text>
                <Text style={styles.body}>
                  Camera access lets you scan artworks and discover their stories.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.button}
                onPress={handleCameraPermission}
              >
                <Text style={styles.buttonText}>Enable Camera</Text>
              </TouchableOpacity>
              {cameraPermission?.granted && (
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={handleNext}
                >
                  <Text style={styles.buttonTextSecondary}>Continue</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Screen 3: Mission */}
          <View key="3" style={styles.page}>
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>🎨</Text>
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.headline}>Curate Your Collection.</Text>
                <Text style={styles.body}>
                  Build your digital museum passport. Every scan adds to your personal gallery.
                </Text>
              </View>
              <TouchableOpacity style={styles.button} onPress={handleNext}>
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Screen 4: Simulation */}
          <View key="4" style={styles.page}>
            <View style={styles.content}>
              <View style={styles.textContainer}>
                <Text style={styles.headline}>Try It Now</Text>
                <Text style={styles.body}>
                  See how it works, even from home.
                </Text>
              </View>
              
              <View style={styles.simulationContainer}>
                <Image
                  source={{
                    uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
                  }}
                  style={styles.simulationImage}
                  resizeMode="contain"
                />
                
                {isSimulating ? (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Scanning...</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.simulateButton}
                    onPress={handleSimulateScan}
                  >
                    <Text style={styles.simulateButtonText}>Simulate Scan</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleEnterMuseum}
              >
                <Text style={styles.buttonText}>Enter Museum</Text>
              </TouchableOpacity>
            </View>
          </View>
        </PagerView>

        {/* Page Indicators */}
        <View style={styles.indicators}>
          {[0, 1, 2, 3].map((index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                currentPage === index && styles.indicatorActive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Result Modal from Simulation */}
      {showResult && (
        <ResultCard
          visible={showResult}
          onClose={() => setShowResult(false)}
          artwork={{
            id: 1,
            title: 'The Starry Night',
            artist: 'Vincent van Gogh',
            description: {
              description: 'A famous post-impressionist painting depicting a swirling night sky over a village.',
              year: 1889,
              style: 'Post-Impressionism',
            },
            image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
            is_verified: true,
            source: 'museum_api',
          }}
          similarity={0.95}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 16,
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 32,
  },
  icon: {
    fontSize: 80,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 48,
    paddingHorizontal: 24,
  },
  headline: {
    ...typography.headline1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonPrimary: {
    marginTop: 24,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 12,
  },
  buttonText: {
    ...typography.label,
    color: colors.background,
    fontSize: 16,
  },
  buttonTextSecondary: {
    ...typography.label,
    color: colors.text,
    fontSize: 16,
  },
  simulationContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 32,
  },
  simulationImage: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 12,
    marginBottom: 24,
  },
  simulateButton: {
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  simulateButtonText: {
    ...typography.label,
    color: colors.text,
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    alignItems: 'center',
    transform: [{ translateY: -20 }],
  },
  loadingText: {
    ...typography.body,
    color: colors.text,
    marginTop: 12,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  indicatorActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
});
