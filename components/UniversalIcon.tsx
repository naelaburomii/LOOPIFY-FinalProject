import React from 'react';
import { Platform, Text, StyleSheet, TextStyle } from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

// Material Icons Unicode Codepoints Mapping
const materialIconCodepoints: { [key: string]: string } = {
  'home': '\ue88a',
  'calendar-today': '\ue935',
  'call': '\ue0b0',
  'delete': '\ue872',
  'arrow-back': '\ue5c4',
  'arrow-forward': '\ue5c8',
  'menu': '\ue5d2',
  'close': '\ue5cd',
  'search': '\ue8b6',
  'add': '\ue145',
  'remove': '\ue15b',
  'edit': '\ue254',
  'save': '\ue161',
  'cancel': '\ue5c9',
  'check': '\ue5ca',
  'check-circle': '\ue86c',
  'account': '\ue853',
  'account-circle': '\ue853',
  'store': '\ue8d1',
  'storefront': '\ue8d1',
  'shopping-cart': '\ue8cc',
  'cart': '\ue8cc',
  'inventory': '\ue179',
  'cube': '\ue1b2',
  'package': '\ue48b',
  'people': '\ue7fb',
  'people-outline': '\ue7fb',
  'notifications': '\ue7f4',
  'notifications-outline': '\ue7f4',
  'settings': '\ue8b8',
  'settings-outline': '\ue8b8',
  'dashboard': '\ue871',
  'dashboard-outline': '\ue871',
  'orders': '\ue8d5',
  'document-text': '\ue873',
  'chat': '\ue0b7',
  'chat-outline': '\ue0b7',
  'message': '\ue0c9',
  'send': '\ue163',
  'camera': '\ue3af',
  'image': '\ue3f4',
  'image-outline': '\ue3f4',
  'camera-alt': '\ue412',
  'location-on': '\ue55f',
  'map': '\ue55b',
  'phone': '\ue0cd',
  'email': '\ue0be',
  'star': '\ue838',
  'star-outline': '\ue83a',
  'favorite': '\ue87d',
  'favorite-outline': '\ue87e',
  'visibility': '\ue8f4',
  'visibility-off': '\ue8f5',
  'lock': '\ue897',
  'lock-outline': '\ue897',
  'lock-open': '\ue898',
  'key': '\ue8d4',
  'info': '\ue88e',
  'info-outline': '\ue88e',
  'warning': '\ue002',
  'error': '\ue000',
  'checkmark': '\ue5ca',
  'chevron-down': '\ue5cf',
  'chevron-up': '\ue5ce',
  'chevron-left': '\ue5cb',
  'chevron-right': '\ue5cc',
  'arrow-up': '\ue5d8',
  'arrow-down': '\ue5db',
  'more-vert': '\ue5d4',
  'more-horiz': '\ue5d3',
  'filter': '\ue3d3',
  'sort': '\ue164',
  'refresh': '\ue5d5',
  'download': '\ue2c4',
  'upload': '\ue2c6',
  'print': '\ue8ad',
  'share': '\ue80d',
  'link': '\ue157',
  'copy': '\ue14d',
  'cut': '\ue14e',
  'paste': '\ue14f',
  'undo': '\ue166',
  'redo': '\ue15a',
  'delete-outline': '\ue872',
  'add-circle': '\ue147',
  'remove-circle': '\ue15c',
  'check-circle-outline': '\ue92d',
  'radio-button-unchecked': '\ue836',
  'radio-button-checked': '\ue837',
  'check-box': '\ue834',
  'check-box-outline-blank': '\ue835',
};

// Comprehensive Icon Name Mapping
const iconMap: { [key: string]: { material?: string; materialCommunity?: string; ionicons?: string } } = {
  'home': { material: 'home', ionicons: 'home' },
  'arrow-back': { material: 'arrow-back', ionicons: 'arrow-back' },
  'arrow-forward': { material: 'arrow-forward', ionicons: 'arrow-forward' },
  'menu': { material: 'menu', ionicons: 'menu' },
  'close': { material: 'close', ionicons: 'close' },
  'search': { material: 'search', ionicons: 'search' },
  'add': { material: 'add', ionicons: 'add' },
  'remove': { material: 'remove', ionicons: 'remove' },
  'edit': { material: 'edit', ionicons: 'create-outline' },
  'save': { material: 'save', ionicons: 'save-outline' },
  'cancel': { material: 'cancel', ionicons: 'close-circle-outline' },
  'check': { material: 'check', ionicons: 'checkmark' },
  'check-circle': { material: 'check-circle', ionicons: 'checkmark-circle' },
  'account': { material: 'account', ionicons: 'person' },
  'account-circle': { material: 'account-circle', ionicons: 'person-circle' },
  'store': { material: 'store', ionicons: 'storefront' },
  'storefront': { material: 'storefront', ionicons: 'storefront' },
  'shopping-cart': { material: 'shopping-cart', ionicons: 'cart' },
  'cart': { material: 'shopping-cart', ionicons: 'cart' },
  'inventory': { material: 'inventory', ionicons: 'cube' },
  'cube': { material: 'cube', ionicons: 'cube' },
  'package': { material: 'package', ionicons: 'cube-outline' },
  'people': { material: 'people', ionicons: 'people' },
  'people-outline': { material: 'people', ionicons: 'people-outline' },
  'notifications': { material: 'notifications', ionicons: 'notifications' },
  'notifications-outline': { material: 'notifications-outline', ionicons: 'notifications-outline' },
  'settings': { material: 'settings', ionicons: 'settings' },
  'settings-outline': { material: 'settings-outline', ionicons: 'settings-outline' },
  'dashboard': { material: 'dashboard', ionicons: 'grid' },
  'dashboard-outline': { material: 'dashboard-outline', ionicons: 'grid-outline' },
  'orders': { material: 'orders', ionicons: 'document-text' },
  'document-text': { material: 'description', ionicons: 'document-text' },
  'chat': { material: 'chat', ionicons: 'chatbubbles' },
  'chat-outline': { material: 'chat-outline', ionicons: 'chatbubbles-outline' },
  'message': { material: 'message', ionicons: 'mail' },
  'send': { material: 'send', ionicons: 'send' },
  'camera': { material: 'camera', ionicons: 'camera' },
  'image': { material: 'image', ionicons: 'image' },
  'image-outline': { material: 'image-outline', ionicons: 'image-outline' },
  'camera-alt': { material: 'camera-alt', ionicons: 'camera-outline' },
  'location-on': { material: 'location-on', ionicons: 'location' },
  'map': { material: 'map', ionicons: 'map' },
  'phone': { material: 'phone', ionicons: 'call' },
  'email': { material: 'email', ionicons: 'mail' },
  'star': { material: 'star', ionicons: 'star' },
  'star-outline': { material: 'star-outline', ionicons: 'star-outline' },
  'favorite': { material: 'favorite', ionicons: 'heart' },
  'favorite-outline': { material: 'favorite-outline', ionicons: 'heart-outline' },
  'visibility': { material: 'visibility', ionicons: 'eye' },
  'visibility-off': { material: 'visibility-off', ionicons: 'eye-off' },
  'lock': { material: 'lock', ionicons: 'lock-closed' },
  'lock-outline': { material: 'lock-outline', ionicons: 'lock-closed-outline' },
  'lock-open': { material: 'lock-open', ionicons: 'lock-open' },
  'key': { material: 'key', ionicons: 'key' },
  'info': { material: 'info', ionicons: 'information-circle' },
  'info-outline': { material: 'info-outline', ionicons: 'information-circle-outline' },
  'warning': { material: 'warning', ionicons: 'warning' },
  'error': { material: 'error', ionicons: 'alert-circle' },
  'checkmark': { material: 'check', ionicons: 'checkmark' },
  'chevron-down': { material: 'keyboard-arrow-down', ionicons: 'chevron-down' },
  'chevron-up': { material: 'keyboard-arrow-up', ionicons: 'chevron-up' },
  'chevron-left': { material: 'keyboard-arrow-left', ionicons: 'chevron-back' },
  'chevron-right': { material: 'keyboard-arrow-right', ionicons: 'chevron-forward' },
  'arrow-up': { material: 'arrow-upward', ionicons: 'arrow-up' },
  'arrow-down': { material: 'arrow-downward', ionicons: 'arrow-down' },
  'more-vert': { material: 'more-vert', ionicons: 'ellipsis-vertical' },
  'more-horiz': { material: 'more-horiz', ionicons: 'ellipsis-horizontal' },
  'filter': { material: 'filter-list', ionicons: 'filter' },
  'sort': { material: 'sort', ionicons: 'swap-vertical' },
  'refresh': { material: 'refresh', ionicons: 'refresh' },
  'download': { material: 'download', ionicons: 'download' },
  'upload': { material: 'upload', ionicons: 'cloud-upload' },
  'print': { material: 'print', ionicons: 'print' },
  'share': { material: 'share', ionicons: 'share' },
  'link': { material: 'link', ionicons: 'link' },
  'copy': { material: 'content-copy', ionicons: 'copy' },
  'cut': { material: 'content-cut', ionicons: 'cut' },
  'paste': { material: 'content-paste', ionicons: 'clipboard' },
  'undo': { material: 'undo', ionicons: 'arrow-undo' },
  'redo': { material: 'redo', ionicons: 'arrow-redo' },
  'delete-outline': { material: 'delete-outline', ionicons: 'trash-outline' },
  'add-circle': { material: 'add-circle', ionicons: 'add-circle' },
  'remove-circle': { material: 'remove-circle', ionicons: 'remove-circle' },
  'check-circle-outline': { material: 'check-circle-outline', ionicons: 'checkmark-circle-outline' },
  'radio-button-unchecked': { material: 'radio-button-unchecked', ionicons: 'radio-button-off' },
  'radio-button-checked': { material: 'radio-button-checked', ionicons: 'radio-button-on' },
  'check-box': { material: 'check-box', ionicons: 'checkbox' },
  'check-box-outline-blank': { material: 'check-box-outline-blank', ionicons: 'square-outline' },
};

interface UniversalIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: TextStyle | TextStyle[];
  family?: 'material' | 'materialCommunity' | 'ionicons';
}

export default function UniversalIcon({
  name,
  size = 24,
  color = '#000000',
  style,
  family,
}: UniversalIconProps) {
  const isWeb = Platform.OS === 'web';
  const iconMapping = iconMap[name] || { material: name, ionicons: name };

  // Web-specific rendering with Material Icons Unicode codepoints
  if (isWeb && (family === 'material' || !family)) {
    const materialIconName = iconMapping?.material || iconMapping?.materialCommunity || name;
    const codepoint = materialIconCodepoints[materialIconName];

    if (codepoint) {
      return (
        <Text
          style={[
            {
              fontFamily: 'Material Icons',
              fontSize: size,
              color: color,
              fontStyle: 'normal',
              fontWeight: 'normal',
              lineHeight: size,
              textAlign: 'center',
              includeFontPadding: false,
            },
            style,
          ]}
        >
          {codepoint}
        </Text>
      );
    }
  }

  // Fallback 1: MaterialCommunityIcons
  if (family === 'materialCommunity' || (!family && iconMapping?.materialCommunity)) {
    const iconName = iconMapping?.materialCommunity || name;
    try {
      return (
        <MaterialCommunityIcons
          name={iconName as any}
          size={size}
          color={color}
          style={style}
        />
      );
    } catch (e) {
      // Icon doesn't exist, continue to next fallback
    }
  }

  // Fallback 2: MaterialIcons
  if (family === 'material' || (!family && iconMapping?.material)) {
    const iconName = iconMapping?.material || name;
    try {
      return (
        <MaterialIcons
          name={iconName as any}
          size={size}
          color={color}
          style={style}
        />
      );
    } catch (e) {
      // Icon doesn't exist, continue to next fallback
    }
  }

  // Fallback 3: Ionicons (most comprehensive)
  const ioniconsName = iconMapping?.ionicons || name;
  try {
    return (
      <Ionicons
        name={ioniconsName as any}
        size={size}
        color={color}
        style={style}
      />
    );
  } catch (e) {
    // Icon doesn't exist, continue to final fallback
  }

  // Final fallback: Direct MaterialIcons with original name
  return (
    <MaterialIcons
      name={name as any}
      size={size}
      color={color}
      style={style}
    />
  );
}

