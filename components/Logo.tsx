import React from 'react';
import { View, Image, ImageStyle, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../theme/colors';

interface LogoProps {
  size?: number;
  style?: ImageStyle | ViewStyle | (ImageStyle | ViewStyle)[];
}

// Set this to true once you've added logo.png to the assets folder
// IMPORTANT: Make sure logo.png exists in assets/ before setting this to true
const USE_LOGO_IMAGE = true;

export default function Logo({ size = 120, style }: LogoProps) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  
  // Use logo image if available, otherwise use icon fallback
  if (USE_LOGO_IMAGE) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
            backgroundColor: colors.surface,
            borderWidth: 2,
            borderColor: colors.border,
          },
          style as ViewStyle,
        ]}
      >
        <Image
          source={require('../assets/loopifyLogo.png')}
          resizeMode="cover"
          style={{
            width: size,
            height: size,
          }}
        />
      </View>
    );
  }

  // Fallback to icon (circular background)
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: `${colors.primary}15`,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: `${colors.primary}30`,
        },
        style,
      ]}
    >
      <Ionicons name="storefront" size={size * 0.5} color={colors.primary} />
    </View>
  );
}

