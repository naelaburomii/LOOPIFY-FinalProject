export const lightColors = {
  // Background / Main Canvas
  background: '#FFFFFF', // Primary background
  backgroundAlt: '#F8FAFC', // Alternative background
  
  // Neutral / Card Background / Surfaces
  surface: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  surfaceElevated: '#E5E7EB',
  
  // Text
  text: '#111827', // Primary text - high contrast
  textSecondary: '#6B7280', // Secondary text
  textTertiary: '#4B5563', // Subdued text
  textLight: '#9CA3AF', // Light Gray
  
  // Primary Accent / Brand Color
  primary: '#1D4ED8', // Strong blue - buttons, active nav, highlights
  primaryLight: '#3B82F6', // Lighter blue - hover states, secondary buttons
  primaryDark: '#1E40AF',
  
  // Secondary Accent
  secondary: '#3B82F6', // Lighter/softer blue
  secondaryLight: '#60A5FA',
  
  // Semantic Colors
  success: '#10B981', // Green - success statuses
  warning: '#F59E0B', // Amber - warnings, cautions
  error: '#EF4444', // Red - errors, critical alerts
  
  // Borders & Dividers
  border: '#E5E7EB',
  divider: '#E5E7EB',
  
  // Shadows
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.15)',
};

export const darkColors = {
  // Background / Main Canvas
  background: '#111827', // Dark gray background
  backgroundAlt: '#1F2937', // Alternative dark background
  
  // Neutral / Card Background / Surfaces
  surface: '#1F2937', // Dark surface
  surfaceVariant: '#374151', // Darker variant
  surfaceElevated: '#4B5563', // Elevated dark surface
  
  // Text
  text: '#F9FAFB', // Light text - high contrast
  textSecondary: '#D1D5DB', // Secondary light text
  textTertiary: '#9CA3AF', // Subdued light text
  textLight: '#6B7280', // Light Gray
  
  // Primary Accent / Brand Color
  primary: '#3B82F6', // Lighter blue for dark mode
  primaryLight: '#60A5FA', // Even lighter blue
  primaryDark: '#2563EB', // Darker blue
  
  // Secondary Accent
  secondary: '#60A5FA', // Lighter blue
  secondaryLight: '#93C5FD',
  
  // Semantic Colors
  success: '#10B981', // Green - same in both modes
  warning: '#F59E0B', // Amber - same in both modes
  error: '#EF4444', // Red - same in both modes
  
  // Borders & Dividers
  border: '#374151', // Dark border
  divider: '#374151', // Dark divider
  
  // Shadows
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowDark: 'rgba(0, 0, 0, 0.5)',
};

// Default export for backward compatibility (light mode)
export const colors = lightColors;

// Helper function to get colors based on theme mode
export const getColors = (isDark: boolean) => {
  return isDark ? darkColors : lightColors;
};

export const gradients = {
  primary: ['#1D4ED8', '#3B82F6'],
  secondary: ['#3B82F6', '#60A5FA'],
  background: ['#FFFFFF', '#F8FAFC'],
};
