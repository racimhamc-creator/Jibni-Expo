import { Tabs } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function TabsLayout() {
  const user = useAuthStore((state) => state.user);
  const isDriver = user?.role === 'driver';

  return (
    <Tabs 
      screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      initialRouteName="index"
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isDriver ? 'Driver' : 'Home',
          tabBarLabel: isDriver ? 'Driver' : 'Home',
        }}
      />
      {isDriver && (
        <Tabs.Screen
          name="driver-home"
          options={{
            title: 'Driver Home',
            tabBarLabel: 'Driver',
          }}
        />
      )}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      />
      <Tabs.Screen
        name="address-autocomplete"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="become-driver"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
