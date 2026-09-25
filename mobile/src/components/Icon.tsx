import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export type IconName = keyof typeof Ionicons.glyphMap;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: React.ComponentProps<typeof Ionicons>['style'];
}

export default function Icon({ name, size = 20, color = Colors.textSecondary, style }: IconProps) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}
