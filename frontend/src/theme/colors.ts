/**
 * Global Theme Colors - Strict Dark Mode
 * Museum Quality Design System
 */

export const colors = {
  // Backgrounds
  background: '#050505',
  card: '#1A1A1A',
  surface: '#252525',
  
  // Text
  text: '#EAEAEA',
  textSecondary: '#B0B0B0',
  textTertiary: '#808080',
  
  // Accents
  primary: '#D4AF37', // Gold for museum elegance
  primaryDark: '#B8941F',
  
  // Status
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  
  // Badges
  verified: '#4CAF50',
  aiEstimate: '#FF9800',
  
  // Borders
  border: '#333333',
  divider: '#2A2A2A',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
} as const;

export type Colors = typeof colors;
