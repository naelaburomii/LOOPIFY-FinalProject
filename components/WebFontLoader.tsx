import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * WebFontLoader ensures fonts are loaded before rendering on web
 * This prevents icon squares and font loading errors
 */
export default function WebFontLoader() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // On native platforms, fonts are handled automatically
      setFontsLoaded(true);
      return;
    }

    // On web, wait for fonts to load
    const loadFonts = async () => {
      try {
        // Wait for document fonts to be ready
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }

        // Additional check for Material Icons
        if (document.fonts && document.fonts.check) {
          // Wait a bit for fonts to be available
          let attempts = 0;
          const maxAttempts = 10;
          
          while (attempts < maxAttempts) {
            // Check if Material Icons font is loaded
            const materialIconsLoaded = document.fonts.check('16px material');
            const materialCommunityLoaded = document.fonts.check('16px material-community');
            const ioniconsLoaded = document.fonts.check('16px ionicons');
            
            if (materialIconsLoaded || materialCommunityLoaded || ioniconsLoaded || attempts >= maxAttempts - 1) {
              break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
        }

        setFontsLoaded(true);
      } catch (error) {
        console.warn('Font loading check failed, proceeding anyway:', error);
        // Proceed even if font check fails
        setFontsLoaded(true);
      }
    };

    loadFonts();
  }, []);

  // On web, don't render children until fonts are loaded
  // This prevents icon squares from appearing
  if (Platform.OS === 'web' && !fontsLoaded) {
    return null;
  }

  return null;
}
