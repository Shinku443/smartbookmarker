import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type AddBookmarkScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AddBookmark'>;

interface Props {
  navigation: AddBookmarkScreenNavigationProp;
}

export default function AddBookmarkScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState('');

  const handleSave = () => {
    if (!title.trim() || !url.trim()) {
      Alert.alert('Error', 'Please enter both title and URL');
      return;
    }

    // TODO: Integrate with actual bookmark creation API
    Alert.alert('Success', 'Bookmark added successfully!', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Add New Bookmark</Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter bookmark title"
              placeholderTextColor="#9ca3af"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://example.com"
              placeholderTextColor="#9ca3af"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tags (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="react, javascript, tutorial"
              placeholderTextColor="#9ca3af"
              value={tags}
              onChangeText={setTags}
            />
            <Text style={styles.hint}>
              Separate tags with commas
            </Text>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Add Bookmark</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
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
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f9fafb',
    fontSize: 16,
  },
  hint: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#9ca3af',
    fontSize: 16,
  },
});
