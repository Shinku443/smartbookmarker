import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Bookmark } from '@smart/core';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

// Mock data for now - will integrate with actual API later
const mockBookmarks: Bookmark[] = [
  {
    id: '1',
    title: 'React Navigation Documentation',
    url: 'https://reactnavigation.org/docs/getting-started',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: [{ label: 'react', type: 'auto' }, { label: 'navigation', type: 'auto' }],
    source: 'manual',
  },
  {
    id: '2',
    title: 'TypeScript Handbook',
    url: 'https://www.typescriptlang.org/docs/',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    tags: [{ label: 'typescript', type: 'auto' }],
    source: 'manual',
  },
];

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks] = useState<Bookmark[]>(mockBookmarks);

  const filteredBookmarks = useMemo(() => {
    if (!searchQuery.trim()) return bookmarks;

    return bookmarks.filter(bookmark =>
      bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.tags.some(tag => tag.label.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [bookmarks, searchQuery]);

  const renderBookmark = ({ item }: { item: Bookmark }) => (
    <TouchableOpacity
      style={styles.bookmarkCard}
      onPress={() => navigation.navigate('BookmarkDetail', { bookmarkId: item.id })}
    >
      <View style={styles.bookmarkContent}>
        <Text style={styles.bookmarkTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.bookmarkUrl} numberOfLines={1}>
          {item.url}
        </Text>
        {item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 3).map((tag, index) => (
              <Text key={index} style={styles.tag}>
                #{tag.label}
              </Text>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1f2937" />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search bookmarks..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Add Bookmark Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddBookmark')}
        >
          <Text style={styles.addButtonText}>+ Add Bookmark</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Bookmarks List */}
      <FlatList
        data={filteredBookmarks}
        renderItem={renderBookmark}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {filteredBookmarks.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No bookmarks found' : 'No bookmarks yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try a different search term' : 'Add your first bookmark!'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827', // emperor-bg
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1f2937', // emperor-sidebar
  },
  searchInput: {
    backgroundColor: '#374151', // emperor-surface
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f9fafb', // emperor-text
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1f2937', // emperor-sidebar
  },
  addButton: {
    backgroundColor: '#fbbf24', // emperor-accent
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#111827', // emperor-bg
    fontWeight: '600',
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonText: {
    fontSize: 20,
  },
  listContainer: {
    padding: 16,
  },
  bookmarkCard: {
    backgroundColor: '#1f2937', // emperor-sidebar
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151', // emperor-border
  },
  bookmarkContent: {
    flex: 1,
  },
  bookmarkTitle: {
    color: '#f9fafb', // emperor-text
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bookmarkUrl: {
    color: '#9ca3af', // emperor-muted
    fontSize: 14,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    color: '#fbbf24', // emperor-accent
    fontSize: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
  },
});
