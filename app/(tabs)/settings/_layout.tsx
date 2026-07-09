import { Stack } from 'expo-router';

export default function SettingsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        // Transparent so the shared tab atmosphere (behind the navigator)
        // shows through the Settings screens like it does on Play/Stats.
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}
