/**
 * Result Card Component - Bottom Sheet Modal
 * Displays artwork results with trust badges
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
} from 'react-native';
import { Building2, Sparkles } from 'lucide-react-native';
import { colors, typography } from '../theme';

const { width } = Dimensions.get('window');

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
  artwork: Artwork;
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
  const isVerified = artwork.is_verified ?? false;
  const descriptionText =
    typeof artwork.description === 'string'
      ? artwork.description
      : artwork.description?.description || '';

  const handlePlayAudio = () => {
    // Mock audio player for now
    console.log('Playing audio guide for:', artwork.title);
    // TODO: Implement audio playback
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.container}>
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Trust Badge */}
            <View style={styles.badgeContainer}>
              {isVerified ? (
                <View style={styles.verifiedBadge}>
                  <Building2 size={16} color={colors.verified} />
                  <Text style={styles.verifiedBadgeText}>
                    Official Museum Data
                  </Text>
                </View>
              ) : (
                <View style={styles.aiBadge}>
                  <Sparkles size={16} color={colors.aiEstimate} />
                  <Text style={styles.aiBadgeText}>AI Analysis (Est.)</Text>
                </View>
              )}
            </View>

            {/* Title - Large Serif */}
            <Text style={styles.title}>{artwork.title}</Text>

            {/* Artist & Date - Medium Sans, Grey */}
            <View style={styles.metaContainer}>
              <Text style={styles.artist}>by {artwork.artist}</Text>
              {artwork.year && (
                <Text style={styles.year}>{artwork.year}</Text>
              )}
            </View>

            {/* Artwork Image */}
            {artwork.image_url && artwork.image_url !== 'placeholder_url' && (
              <Image
                source={{ uri: artwork.image_url }}
                style={styles.artworkImage}
                resizeMode="contain"
              />
            )}

            {/* The Dinner Party Fact - Highlighted Box */}
            <View style={styles.factBox}>
              <Text style={styles.factLabel}>Did You Know?</Text>
              <Text style={styles.factText}>
                {descriptionText || 'This artwork has a fascinating history waiting to be discovered.'}
              </Text>
            </View>

            {/* Additional Info */}
            {artwork.description?.style && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Style:</Text>
                <Text style={styles.infoValue}>{artwork.description.style}</Text>
              </View>
            )}

            {similarity && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Match Confidence:</Text>
                <Text style={styles.infoValue}>
                  {(similarity * 100).toFixed(1)}%
                </Text>
              </View>
            )}

            {/* Report Button for Unverified */}
            {!isVerified && onReportIssue && (
              <TouchableOpacity
                style={styles.reportButton}
                onPress={() => onReportIssue(artwork.id)}
              >
                <Text style={styles.reportButtonText}>Report Issue</Text>
              </TouchableOpacity>
            )}

            {/* Audio Button - Thumb Friendly */}
            <TouchableOpacity
              style={styles.audioButton}
              onPress={handlePlayAudio}
            >
              <Text style={styles.audioButtonText}>🎵 Play Audio Guide</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  container: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 12,
    paddingBottom: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  scrollView: {
    paddingHorizontal: 24,
  },
  badgeContainer: {
    marginBottom: 16,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.verified}20`,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  verifiedBadgeText: {
    ...typography.labelSmall,
    color: colors.verified,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.aiEstimate}20`,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  aiBadgeText: {
    ...typography.labelSmall,
    color: colors.aiEstimate,
  },
  title: {
    ...typography.headline1,
    color: colors.text,
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  artist: {
    ...typography.body,
    color: colors.textSecondary,
  },
  year: {
    ...typography.body,
    color: colors.textTertiary,
  },
  artworkImage: {
    width: '100%',
    height: width * 0.8,
    borderRadius: 12,
    marginBottom: 24,
    backgroundColor: colors.surface,
  },
  factBox: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  factLabel: {
    ...typography.label,
    color: colors.primary,
    marginBottom: 8,
  },
  factText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  infoLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  reportButton: {
    backgroundColor: colors.error,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  reportButtonText: {
    ...typography.label,
    color: colors.text,
  },
  audioButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
    minHeight: 60, // Thumb friendly
  },
  audioButtonText: {
    ...typography.label,
    color: colors.background,
    fontSize: 18,
  },
  closeButton: {
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginHorizontal: 24,
    marginTop: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    ...typography.label,
    color: colors.text,
  },
});
