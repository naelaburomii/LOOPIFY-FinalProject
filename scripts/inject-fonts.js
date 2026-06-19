const fs = require('fs');
const path = require('path');

/**
 * Production font injection for Expo Web icon fonts.
 * Uses @expo/vector-icons TTF files (not MDI) with correct family names.
 */

const EXPO_ICONS_VERSION = '15.0.3';
const CDN_BASE = `https://unpkg.com/@expo/vector-icons@${EXPO_ICONS_VERSION}/build/vendor/react-native-vector-icons/Fonts`;

const FONTS = {
  materialCommunity: `${CDN_BASE}/MaterialCommunityIcons.ttf`,
  material: `${CDN_BASE}/MaterialIcons.ttf`,
  ionicons: `${CDN_BASE}/Ionicons.ttf`,
};

const fontInterceptionScript = `<script>
(function() {
  'use strict';
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  function shouldRedirectLocalFont(url) {
    if (typeof url !== 'string') return false;
    const iconFonts = ['MaterialCommunityIcons', 'MaterialIcons', 'Ionicons'];
    const blockedPaths = ['/assets/', 'node_modules', '_expo/', '/dist/'];
    return iconFonts.some(function(font) {
      return url.includes(font) && blockedPaths.some(function(p) { return url.includes(p); });
    });
  }

  function cdnSourceForFamily(family, source) {
    if (family === 'material-community' || source.includes('MaterialCommunityIcons')) {
      return 'url("${FONTS.materialCommunity}") format("truetype")';
    }
    if (family === 'material' || source.includes('MaterialIcons')) {
      return 'url("${FONTS.material}") format("truetype")';
    }
    if (family === 'ionicons' || source.includes('Ionicons')) {
      return 'url("${FONTS.ionicons}") format("truetype")';
    }
    return null;
  }

  if (window.FontFace) {
    var OriginalFontFace = window.FontFace;
    window.FontFace = function(family, source, descriptors) {
      if (typeof source === 'string' && shouldRedirectLocalFont(source)) {
        var redirected = cdnSourceForFamily(family, source);
        if (redirected) source = redirected;
      }
      return new OriginalFontFace(family, source, descriptors);
    };
  }

  if (window.FontFace && document.fonts) {
    [
      new FontFace('material-community', 'url("${FONTS.materialCommunity}") format("truetype")'),
      new FontFace('material', 'url("${FONTS.material}") format("truetype")'),
      new FontFace('ionicons', 'url("${FONTS.ionicons}") format("truetype")')
    ].forEach(function(fontFace) {
      try {
        document.fonts.add(fontFace);
        fontFace.load().catch(function(err) {
          console.warn('Icon font preload warning:', fontFace.family, err);
        });
      } catch (e) {
        console.warn('Icon font creation warning:', fontFace.family, e);
      }
    });
  }
})();
</script>`;

const fontSetup = `<link rel="preconnect" href="https://unpkg.com" crossorigin>
<link rel="preload" as="font" type="font/ttf" crossorigin="anonymous" href="${FONTS.materialCommunity}">
<link rel="preload" as="font" type="font/ttf" crossorigin="anonymous" href="${FONTS.material}">
<link rel="preload" as="font" type="font/ttf" crossorigin="anonymous" href="${FONTS.ionicons}">
${fontInterceptionScript}
<style id="icon-fonts">
@font-face {
  font-family: 'material-community';
  src: url('${FONTS.materialCommunity}') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'material';
  src: url('${FONTS.material}') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'ionicons';
  src: url('${FONTS.ionicons}') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
</style>`;

const distDir = path.join(__dirname, '..', 'dist');

function findHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findHtmlFiles(filePath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function stripOldFontInjection(content) {
  content = content.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com"[^>]*>\s*/g, '');
  content = content.replace(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com"[^>]*>\s*/g, '');
  content = content.replace(/<link rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net"[^>]*>\s*/g, '');
  content = content.replace(/<link rel="preconnect" href="https:\/\/unpkg\.com"[^>]*>\s*/g, '');
  content = content.replace(/<link rel="preload" as="font"[^>]*>\s*/g, '');
  content = content.replace(/<link href="https:\/\/fonts\.googleapis\.com\/icon[^>]*>\s*/g, '');
  content = content.replace(/<script>\s*\(function\(\)\s*\{[\s\S]*?Icon font creation warning[\s\S]*?<\/script>\s*/g, '');
  content = content.replace(/<style id="icon-fonts">[\s\S]*?<\/style>\s*/g, '');
  return content;
}

const htmlFiles = findHtmlFiles(distDir);
let injectedCount = 0;

htmlFiles.forEach((filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('</head>')) {
    return;
  }

  content = stripOldFontInjection(content);

  if (!content.includes('id="icon-fonts"')) {
    content = content.replace('</head>', `${fontSetup}</head>`);
    fs.writeFileSync(filePath, content, 'utf8');
    injectedCount++;
    console.log(`✓ Injected fonts into ${path.relative(distDir, filePath)}`);
  }
});

console.log(`\nFont injection complete! Processed ${htmlFiles.length} files, injected into ${injectedCount} files.`);
