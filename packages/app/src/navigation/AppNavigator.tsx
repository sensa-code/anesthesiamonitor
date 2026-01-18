import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import PatientInfoScreen from '../screens/PatientInfoScreen';
import MonitoringScreen from '../screens/MonitoringScreen';
import ResultsScreen from '../screens/ResultsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="PatientInfo"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="PatientInfo"
          component={PatientInfoScreen}
          options={{ title: '病患資料' }}
        />
        <Stack.Screen
          name="Monitoring"
          component={MonitoringScreen}
          options={{ title: '生理監測' }}
        />
        <Stack.Screen
          name="Results"
          component={ResultsScreen}
          options={{ title: '監測結果' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
