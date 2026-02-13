import React from 'react';
import { Box } from '@/src/components/ui';
import { useRouter } from 'expo-router';
import SplashScreen from '@/src/components/splash/SplashScreen';

export default function Index() {
  const router = useRouter();
  return <SplashScreen />;
}
