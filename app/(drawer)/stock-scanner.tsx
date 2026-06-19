import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import Header from '../../components/Header';
import { useDrawer } from '../../contexts/DrawerContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import { findProductByCode } from '../../services/inventory';

export default function StockScannerScreen() {
  const { openDrawer } = useDrawer();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [code, setCode] = useState('');
  const [product, setProduct] = useState<any>(null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Barcode / QR Scan" onMenuPress={openDrawer} />
      <View style={{ padding: 16, gap: 12 }}>
        <Card>
          <Card.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
              Enter barcode/QR value to simulate a scan and retrieve stock information.
            </Text>
            <TextInput mode="outlined" label="Barcode or QR code" value={code} onChangeText={setCode} />
            <Button mode="contained" style={{ marginTop: 10 }} onPress={async () => setProduct(await findProductByCode(code.trim()))}>
              Find Product
            </Button>
          </Card.Content>
        </Card>
        {product && (
          <Card>
            <Card.Content>
              <Text variant="titleMedium">{product.name}</Text>
              <Text variant="bodyMedium">Stock: {product.stockQty ?? 'N/A'}</Text>
              <Text variant="bodySmall">Category: {product.categoryName}</Text>
            </Card.Content>
          </Card>
        )}
      </View>
    </View>
  );
}
