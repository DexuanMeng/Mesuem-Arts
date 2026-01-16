import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';

// TODO: Replace with your backend API URL
const API_BASE_URL = 'http://10.10.20.248:8000'; // For development - your computer's IP
// const API_BASE_URL = 'https://your-backend.onrender.com'; // For production

interface ScanResult {
  status: 'match_found' | 'ai_analysis' | 'not_art';
  artwork?: {
    id: number;
    title: string;
    artist: string;
    description: any;
    image_url: string;
    similarity: number;
  };
  analysis?: string;
  message?: string;
  ai_generated: boolean;
}

export default function ScanScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    // Request location permission on mount
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current || !permission?.granted) {
      Alert.alert('Permission Required', 'Camera permission is required to scan artworks.');
      return;
    }

    if (locationPermission === false) {
      Alert.alert('Location Required', 'Location permission is required for accurate results.');
      return;
    }

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

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission is required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
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
        {/* Overlay */}
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.instructionText}>Point camera at artwork</Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={toggleCameraFacing}
          >
            <Text style={styles.flipButtonText}>Flip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.snapButton, isScanning && styles.snapButtonDisabled]}
            onPress={takePicture}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.snapButtonInner} />
            )}
          </TouchableOpacity>
        </View>
      </CameraView>

      {/* Result Modal */}
      <Modal
        visible={showResult}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResult(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView style={styles.modalScroll}>
              {result?.status === 'match_found' && result.artwork && (
                <>
                  <Text style={styles.modalTitle}>{result.artwork.title}</Text>
                  <Text style={styles.modalArtist}>by {result.artwork.artist}</Text>
                  {result.artwork.image_url && (
                    <Image
                      source={{ uri: result.artwork.image_url }}
                      style={styles.artworkImage}
                      resizeMode="contain"
                    />
                  )}
                  <Text style={styles.modalDescription}>
                    {typeof result.artwork.description === 'string'
                      ? result.artwork.description
                      : JSON.stringify(result.artwork.description, null, 2)}
                  </Text>
                  <View style={styles.similarityBadge}>
                    <Text style={styles.similarityText}>
                      Match: {(result.artwork.similarity * 100).toFixed(1)}%
                    </Text>
                  </View>
                </>
              )}

              {result?.status === 'ai_analysis' && result.analysis && (
                <>
                  <View style={styles.aiBadge}>
                    <Text style={styles.aiBadgeText}>AI Analysis (Unverified)</Text>
                  </View>
                  <Text style={styles.modalTitle}>Artwork Analysis</Text>
                  <Text style={styles.modalDescription}>{result.analysis}</Text>
                </>
              )}

              {result?.status === 'not_art' && (
                <>
                  <Text style={styles.modalTitle}>Not an Artwork</Text>
                  <Text style={styles.modalDescription}>{result.message}</Text>
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowResult(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 300,
    height: 400,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  snapButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ddd',
  },
  snapButtonDisabled: {
    opacity: 0.6,
  },
  snapButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
  },
  flipButton: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
  },
  flipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
  },
  modalScroll: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  modalArtist: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
  artworkImage: {
    width: '100%',
    height: 300,
    marginBottom: 16,
    borderRadius: 8,
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 16,
  },
  similarityBadge: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  similarityText: {
    color: '#fff',
    fontWeight: '600',
  },
  aiBadge: {
    backgroundColor: '#FF9800',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  aiBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
