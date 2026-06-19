import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import type { Order } from '../services/orders';
import { formatOrderStatusLabel, orderStatusChipStyle, type OrderStatusPalette } from '../utils/orderStatusStyle';

type Props = {
  status: Order['status'];
  colors: OrderStatusPalette;
  alignSelf?: ViewStyle['alignSelf'];
};

export function OrderStatusPill({ status, colors, alignSelf = 'flex-start' }: Props) {
  const sc = orderStatusChipStyle(status, colors);
  return (
    <View
      style={[
        styles.pill,
        {
          alignSelf,
          backgroundColor: sc.backgroundColor,
          borderWidth: sc.borderWidth ?? 0,
          borderColor: sc.borderColor,
        },
      ]}
    >
      <Text style={[styles.pillText, { color: sc.color }]}>{formatOrderStatusLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
