import React from 'react';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SocketProvider } from './src/context/SocketContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <SocketProvider>
        <AppNavigator />
      </SocketProvider>
    </SafeAreaProvider>
  );
}
