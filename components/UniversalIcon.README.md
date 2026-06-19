# UniversalIcon Component

A comprehensive icon component that solves web icon rendering issues by providing Material Icons Unicode codepoints support and multi-level fallback system.

## Problem Solved

On web, icons were rendering as squares or question marks because:
- Web doesn't load icon fonts the same way as native
- Missing Unicode codepoint mappings for Material Icons
- Incomplete icon name mappings

## Solution Features

### 1. Material Icons Unicode Codepoints Mapping
- Maps Material Icons to their Unicode codepoints
- Enables proper rendering on web using Google Material Icons CSS font

### 2. Comprehensive Icon Name Mapping
- Maps custom icon names to Material/MaterialCommunity/Ionicons equivalents
- Ensures icons work across all platforms

### 3. Web-Specific Rendering
- On web, uses Material Icons font family with Unicode codepoints
- Falls back to vector icon components if codepoint not found

### 4. Multi-Level Fallback System
1. **Primary (Web)**: Material Icons Unicode codepoints
2. **Fallback 1**: MaterialCommunityIcons from @expo/vector-icons
3. **Fallback 2**: MaterialIcons from @expo/vector-icons
4. **Fallback 3**: Ionicons from @expo/vector-icons
5. **Final**: Direct MaterialIcons with original name

## Usage

```tsx
import UniversalIcon from '../components/UniversalIcon';

// Basic usage
<UniversalIcon name="home" size={24} color="#000000" />

// With custom style
<UniversalIcon 
  name="store" 
  size={32} 
  color="#6366F1" 
  style={{ marginRight: 8 }}
/>

// Force specific icon family
<UniversalIcon 
  name="cart" 
  size={24} 
  color="#000" 
  family="materialCommunity"
/>
```

## Props

- `name` (string, required): Icon name
- `size` (number, optional): Icon size in pixels (default: 24)
- `color` (string, optional): Icon color (default: '#000000')
- `style` (TextStyle | TextStyle[], optional): Additional styles
- `family` ('material' | 'materialCommunity' | 'ionicons', optional): Force specific icon family

## Supported Icons

The component supports a wide range of icons including:
- Navigation: home, arrow-back, arrow-forward, menu, close
- Actions: add, remove, edit, save, delete, search
- UI: check, check-circle, account, settings, notifications
- Business: store, storefront, shopping-cart, inventory, cube
- Communication: chat, message, send, phone, email
- Media: camera, image, location-on, map
- And many more...

## Integration

The component automatically:
- Detects if running on web
- Uses Material Icons Unicode codepoints on web for best rendering
- Falls back to appropriate icon family on native platforms
- Handles missing icons gracefully

## Web Setup

The `web/index.html` file has been updated to include:
- Google Material Icons CSS font link
- Material Icons font-face declaration
- Proper CSS styling for Material Icons

No additional setup required!




