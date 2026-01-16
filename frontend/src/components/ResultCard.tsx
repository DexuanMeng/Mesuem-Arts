// REPLACE content of: components/ResultCard.tsx

/**
 * Result Card Component - "The Floating Monolith"
 * Premium Dark Mode UI for Museum Context
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Building2, Sparkles, X, Play, MessageCircle } from 'lucide-react-native';
import { colors, typography } from '../theme';

const { width, height } = Dimensions.get('window');

// --- KEEPING YOUR EXACT INTERFACES ---
interface Artwork {
  id: number;
  title: string;
  artist: string;
  description: any;
  image_url?: string;
  is_verified?: boolean;
  source?: string;
  confidence_score?: number;
  year?: number;
}

interface ResultCardProps {
  visible: boolean;
  onClose: () => void;
  artwork: Artwork | null; // Allow null to prevent crash
  similarity?: number;
  onReportIssue?: (artworkId: number) => void;
}

export default function ResultCard({
  visible,
  onClose,
  artwork,
  similarity,
  onReportIssue,
}: ResultCardProps) {
  if (!artwork) return null;

  const isVerified = artwork.is_verified ?? false;
  
  // Extract the text safely
  const descriptionText =
    typeof artwork.description === 'string'
      ? artwork.description
      : artwork.description?.description || '';

  const handlePlayAudio = () => {
    console.log('Playing audio guide for:', artwork.title);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Invisible Backdrop to close on tap */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* --- THE MONOLITH CARD --- */}
        <View style={styles.container}>
          
          {/* 1. THE FLOATING TRUST BADGE (Overlapping Top) */}
          <View style={styles.badgeRow}>
            {isVerified ? (
              <View style={[styles.badge, styles.badgeVerified]}>
                <Building2 size={14} color="#FFF" />
                <Text style={styles.badgeText}>OFFICIAL COLLECTION</Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.badgeAi]}>
                <Sparkles size={14} color="#FFF" />
                <Text style={styles.badgeText}>AI ANALYSIS</Text>
              </View>
            )}
          </View>

          {/* Close Button (Top Right) */}
          <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
            <X size={24} style={{ color: '#555' }} />
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={{ paddingBottom: 100 }} // Space for sticky button
            showsVerticalScrollIndicator={false}
          >
            {/* 2. HEADER IDENTITY */}
            <View style={styles.header}>
              <Text style={styles.title}>{artwork.title}</Text>
              <Text style={styles.artist}>
                {artwork.artist} {artwork.year ? ` • ${artwork.year}` : ''}
              </Text>
            </View>

            {/* 3. THE "DINNER PARTY FACT" (Highlighted Hook) */}
            <View style={[
              styles.factBox, 
              isVerified ? styles.borderVerified : styles.borderAi
            ]}>
              <Text style={styles.factText}>
                "{descriptionText.slice(0, 150)}{descriptionText.length > 150 ? '...' : ''}"
              </Text>
            </View>

            {/* 4. VISUAL ANCHOR (Thumbnail) */}
            {artwork.image_url && artwork.image_url !== 'placeholder_url' && (
              <Image
                source={{ uri: artwork.image_url }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            )}

            {/* 5. DEEP DIVE DETAILS */}
            <View style={styles.detailsContainer}>
              {artwork.description?.style && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>STYLE</Text>
                  <Text style={styles.detailValue}>{artwork.description.style}</Text>
                </View>
              )}
              {similarity && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>MATCH ACCURACY</Text>
                  <Text style={styles.detailValue}>{(similarity * 100).toFixed(0)}%</Text>
                </View>
              )}
            </View>

            {/* Feedback Loop */}
            {!isVerified && onReportIssue && (
              <TouchableOpacity 
                style={styles.reportLink}
                onPress={() => onReportIssue(artwork.id)}
              >
                <Text style={styles.reportText}>Report incorrect info</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* 6. STICKY ACTION BAR (Thumb Zone) */}
          <SafeAreaView style={styles.actionBar}>
            <TouchableOpacity 
              style={styles.playButton} 
              onPress={handlePlayAudio}
              activeOpacity={0.8}
            >
              <View style={styles.playIconContainer}>
                <Play size={24} color="#000" style={{ marginLeft: 4 }} />
              </View>
              <View>
                <Text style={styles.playTitle}>Listen</Text>
                <Text style={styles.playSubtitle}>Audio Guide (2m)</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.askButton}>
               <MessageCircle size={24} color="#FFF" />
            </TouchableOpacity>
          </SafeAreaView>

        </View>
      </View>
    </Modal>
  );
}

// --- MUSEUM DARK THEME STYLES ---
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)', // Dim the camera view slightly
  },
  container: {
    height: '65%', // Takes up bottom 65% of screen
    backgroundColor: '#121212', // OLED Black
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    paddingTop: 24, // Space for the overlapping badge
  },
  
  // Floating Badge Logic
  badgeRow: {
    position: 'absolute',
    top: -16, // Pushes it UP out of the card
    left: 24,
    zIndex: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  badgeVerified: {
    backgroundColor: '#065f46', // Emerald 800
  },
  badgeAi: {
    backgroundColor: '#9a3412', // Orange 800
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  
  closeIcon: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 8,
    zIndex: 5,
  },

  scrollView: {
    paddingHorizontal: 24,
    marginTop: 12,
  },

  // Typography
  header: {
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 32,
    // Note: Ensure you load a serif font in App.tsx!
    // fontFamily: 'PlayfairDisplay_700Bold', 
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
    lineHeight: 38,
  },
  artist: {
    fontSize: 16,
    color: '#888',
    fontWeight: '400',
  },

  // The "Dinner Party Fact"
  factBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
  },
  borderVerified: { borderLeftColor: '#065f46' },
  borderAi: { borderLeftColor: '#9a3412' },
  
  factText: {
    color: '#E0E0E0',
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },

  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 24,
    backgroundColor: '#222',
  },

  // Details
  detailsContainer: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  detailRow: {
    gap: 4,
  },
  detailLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  detailValue: {
    color: '#CCC',
    fontSize: 14,
    fontWeight: '600',
  },

  reportLink: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  reportText: {
    color: '#666',
    fontSize: 12,
    textDecorationLine: 'underline',
  },

  // Sticky Action Bar
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#121212', // Match container
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 30, // Safe area
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  playIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playTitle: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  playSubtitle: {
    color: '#666',
    fontSize: 12,
  },
  askButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
});