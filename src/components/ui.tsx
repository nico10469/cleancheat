import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { round } from '../lib/nutrition';
import type { Macros } from '../lib/types';
import { usePalette } from './theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const p = usePalette();
  if (!scroll) return <View style={[styles.screen, { backgroundColor: p.bg }]}>{children}</View>;
  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  return <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }, style]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  const p = usePalette();
  return <Text style={[styles.title, { color: p.text }]}>{children}</Text>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const p = usePalette();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.section, { color: p.muted }]}>{children}</Text>
      {right}
    </View>
  );
}

export function Body({
  children,
  muted,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  muted?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const p = usePalette();
  return (
    <Text style={[styles.body, { color: muted ? p.muted : p.text }, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, small, style }: ButtonProps) {
  const p = usePalette();
  const bg = variant === 'primary' ? p.primary : variant === 'danger' ? p.danger : variant === 'secondary' ? p.card : 'transparent';
  const fg = variant === 'primary' || variant === 'danger' ? p.primaryText : p.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, borderColor: variant === 'secondary' ? p.border : bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label?: string }) {
  const p = usePalette();
  return (
    <View style={styles.field}>
      {label ? <Text style={[styles.label, { color: p.muted }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={p.muted}
        {...props}
        style={[styles.input, { color: p.text, borderColor: p.border, backgroundColor: p.card }, style]}
      />
    </View>
  );
}

/** Numeric input that keeps the raw text while typing and reports a parsed number. */
export function NumberField({
  label,
  value,
  onChange,
  style,
}: {
  label?: string;
  value: number;
  onChange: (n: number) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flex: 1 }, style]}>
      <Field
        label={label}
        keyboardType="decimal-pad"
        defaultValue={value ? String(round(value, 1)) : ''}
        placeholder="0"
        onChangeText={(t) => {
          const n = Number(t.replace(',', '.'));
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
    </View>
  );
}

export function ProgressBar({ value, goal, color }: { value: number; goal: number; color: string }) {
  const p = usePalette();
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  const over = goal > 0 && value > goal * 1.05;
  return (
    <View style={[styles.track, { backgroundColor: p.track }]}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 6, backgroundColor: over ? p.danger : color }} />
    </View>
  );
}

export function MacroLine({ macros, servingsLabel }: { macros: Macros; servingsLabel?: string }) {
  const p = usePalette();
  return (
    <Text style={[styles.macroLine, { color: p.muted }]}>
      <Text style={{ color: p.text, fontWeight: '600' }}>{round(macros.kcal)} kcal</Text>
      {'  '}
      <Text style={{ color: p.protein }}>P {round(macros.protein)}g</Text>
      {'  '}
      <Text style={{ color: p.carbs }}>C {round(macros.carbs)}g</Text>
      {'  '}
      <Text style={{ color: p.fat }}>F {round(macros.fat)}g</Text>
      {servingsLabel ? `  · ${servingsLabel}` : ''}
    </Text>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: active ? p.primary : p.border, backgroundColor: active ? p.primary : p.card }]}
    >
      <Text style={{ color: active ? p.primaryText : p.text, fontSize: 13, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Divider() {
  const p = usePalette();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border, marginVertical: 8 }} />;
}

export const styles = StyleSheet.create({
  screen: { flex: 1 },
  screenContent: { padding: 16, paddingBottom: 48, gap: 12 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 8 },
  title: { fontSize: 22, fontWeight: '700' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  section: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  body: { fontSize: 15, lineHeight: 21 },
  button: { borderRadius: 10, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  buttonSmall: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  buttonText: { fontSize: 15, fontWeight: '600' },
  buttonTextSmall: { fontSize: 13 },
  field: { gap: 4 },
  label: { fontSize: 12, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  track: { height: 10, borderRadius: 6, overflow: 'hidden' },
  macroLine: { fontSize: 13 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
