import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import ScanScreen from './src/screens/ScanScreen';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScanScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
