import React from 'react';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SocketProvider } from './src/context/SocketContext';
import { AuthProvider } from './src/context/AuthContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocketProvider>
          <AppNavigator />
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
