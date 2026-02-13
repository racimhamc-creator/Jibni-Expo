import { Stack, Redirect } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@shopify/restyle';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { theme } from '@/src/theme';
import '@/src/config/i18n';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  
  useSocket();

  return (
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
