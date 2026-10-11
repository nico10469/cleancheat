import { useColorScheme } from 'react-native';

const light = {
  bg: '#F6F7F4',
  card: '#FFFFFF',
  text: '#16201A',
  muted: '#647067',
  border: '#E1E5DF',
  primary: '#2F8F57',
  primaryText: '#FFFFFF',
  danger: '#C2410C',
  protein: '#2563EB',
  carbs: '#D97706',
  fat: '#9333EA',
  track: '#E8ECE6',
};

const dark: typeof light = {
  bg: '#0F1411',
  card: '#18201B',
  text: '#E9EFEA',
  muted: '#93A096',
  border: '#2A342D',
  primary: '#4CB97A',
  primaryText: '#0F1411',
  danger: '#FB923C',
  protein: '#60A5FA',
  carbs: '#FBBF24',
  fat: '#C084FC',
  track: '#26302A',
};

export type Palette = typeof light;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
