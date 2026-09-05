import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/useAuthStore';
import { User } from '../../../types';

const PAGE_SIZE = 20;

export default function AddContactScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  const currentId = currentUser?.id || (currentUser as any)?._id;

  const fetchUsers = useCallback(
    async (pageNum: number, isReset: boolean = false, query: string = searchQuery) => {
      try {
        setError(null);
        if (isReset && !refreshing) {
          setLoading(true);
        } else if (!isReset) {
          setLoadingMore(true);
        }

        const res = await api.get<{ users: User[]; total: number; hasMore: boolean }>(
          '/users',
          {
            params: {
              page: pageNum,
              limit: PAGE_SIZE,
              search: query.trim() || undefined,
              excludeUserId: currentId,
            },
          }
        );

        const fetchedUsers = res.data.users || [];
        setHasMore(res.data.hasMore);
        setPage(pageNum);

        if (isReset) {
          setUsers(fetchedUsers);
        } else {
          setUsers((prev) => {
            const existingIds = new Set(prev.map((u) => u.id));
            const unique = fetchedUsers.filter((u) => !existingIds.has(u.id));
            return [...prev, ...unique];
          });
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch users');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [currentId, searchQuery, refreshing]
  );

  // Initial load
  useEffect(() => {
    fetchUsers(1, true, '');
  }, [currentId]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchUsers(1, true, searchQuery);
    }, 350);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers(1, true, searchQuery);
  };

  const loadMoreUsers = () => {
    if (loading || loadingMore || !hasMore) return;
    fetchUsers(page + 1, false, searchQuery);
  };

  const openChat = (contact: User) => {
    router.replace({
      pathname: '/(main)/chat/[id]',
      params: { id: contact.id, name: contact.name },
    } as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'New Chat / Contacts',
          headerBackTitle: 'Back',
        }}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Error display */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => fetchUsers(1, true, searchQuery)}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* User list */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item, index) => item.id || index.toString()}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMoreUsers}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#007AFF" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'No user matches your search query.'
                  : 'No other registered users found.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.userCard}
              onPress={() => openChat(item)}
              activeOpacity={0.7}
            >
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {item.name?.trim() ? item.name.trim()[0].toUpperCase() : 'U'}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardEmail} numberOfLines={1}>
                  {item.email}
                </Text>
                {item.bio ? (
                  <Text style={styles.cardBio} numberOfLines={1}>
                    {item.bio}
                  </Text>
                ) : null}
              </View>
              <View style={styles.chatBadge}>
                <Text style={styles.chatBadgeText}>Message</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    height: 42,
    backgroundColor: '#EFEFF4',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#000000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginRight: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  cardEmail: {
    fontSize: 13,
    color: '#8E8E93',
  },
  cardBio: {
    fontSize: 12,
    color: '#636366',
    marginTop: 2,
  },
  chatBadge: {
    backgroundColor: '#E8F2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  chatBadgeText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3A3A3C',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  errorBox: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FFEAEA',
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    marginBottom: 6,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  retryText: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
