import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import HomeScreen from '../screens/HomeScreen';
import BookmarkDetailScreen from '../screens/BookmarkDetailScreen';
import AddBookmarkScreen from '../screens/AddBookmarkScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootStackParamList = {
  Home: undefined;
  BookmarkDetail: { bookmarkId: string };
  AddBookmark: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1f2937', // emperor-sidebar
          },
          headerTintColor: '#f9fafb', // emperor-text
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Emperor' }}
        />
        <Stack.Screen
          name="BookmarkDetail"
          component={BookmarkDetailScreen}
          options={{ title: 'Bookmark' }}
        />
        <Stack.Screen
          name="AddBookmark"
          component={AddBookmarkScreen}
          options={{ title: 'Add Bookmark' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
