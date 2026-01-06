import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function SettingsScreen({ navigation }: { navigation: any }) {
  const settings = [
    { title: 'AI Settings', subtitle: 'Configure AI providers and features' },
    { title: 'Display Settings', subtitle: 'Customize appearance and layout' },
    { title: 'Sync Settings', subtitle: 'Manage data synchronization' },
    { title: 'Privacy Settings', subtitle: 'Control data sharing and analytics' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {settings.map((setting, index) => (
          <TouchableOpacity key={index} style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{setting.title}</Text>
              <Text style={styles.settingSubtitle}>{setting.subtitle}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Emperor v1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    padding: 16,
  },
  title: {
    color: '#f9fafb',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  settingItem: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
  },
  chevron: {
    color: '#9ca3af',
    fontSize: 24,
    fontWeight: 'bold',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  versionText: {
    color: '#6b7280',
    fontSize: 14,
  },
});
