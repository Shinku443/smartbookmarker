import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type BookmarkDetailScreenRouteProp = RouteProp<RootStackParamList, 'BookmarkDetail'>;
type BookmarkDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BookmarkDetail'>;

interface Props {
  route: BookmarkDetailScreenRouteProp;
  navigation: BookmarkDetailScreenNavigationProp;
}

export default function BookmarkDetailScreen({ route, navigation }: Props) {
  const { bookmarkId } = route.params;

  // Mock bookmark data - will integrate with actual data later
  const bookmark = {
    id: bookmarkId,
    title: 'Sample Bookmark',
    url: 'https://example.com',
    description: 'This is a sample bookmark description.',
    tags: [{ label: 'sample', type: 'auto' as const }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{bookmark.title}</Text>
        <Text style={styles.url}>{bookmark.url}</Text>

        {bookmark.description && (
          <Text style={styles.description}>{bookmark.description}</Text>
        )}

        <View style={styles.tagsContainer}>
          {bookmark.tags.map((tag, index) => (
            <Text key={index} style={styles.tag}>#{tag.label}</Text>
          ))}
        </View>

        <View style={styles.metaContainer}>
          <Text style={styles.metaText}>
            Created: {new Date(bookmark.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.metaText}>
            Updated: {new Date(bookmark.updatedAt).toLocaleDateString()}
          </Text>
        </View>

        <TouchableOpacity style={styles.openButton}>
          <Text style={styles.openButtonText}>Open in Browser</Text>
        </TouchableOpacity>
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
    marginBottom: 8,
  },
  url: {
    color: '#60a5fa',
    fontSize: 16,
    marginBottom: 16,
  },
  description: {
    color: '#d1d5db',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
    color: '#fbbf24',
    fontSize: 14,
    marginRight: 8,
    marginBottom: 4,
  },
  metaContainer: {
    marginBottom: 24,
  },
  metaText: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 4,
  },
  openButton: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  openButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
});
