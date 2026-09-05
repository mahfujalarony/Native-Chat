import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Conversation, Message } from '../../types';
import { initSocket } from '../../services/socket';

const PAGE_SIZE = 20;

export default function HomeScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  const currentId = currentUser?.id || (currentUser as any)?._id;

  const fetchConversations = useCallback(
    async (pageNum: number, isReset: boolean = false) => {
      if (!currentId) return;
      try {
        setError(null);
        if (isReset && !refreshing) {
          setLoading(true);
        } else if (!isReset) {
          setLoadingMore(true);
        }

        const res = await api.get<{
          conversations: Conversation[];
          total: number;
          hasMore: boolean;
        }>('/chat/conversations', {
          params: {
            userId: currentId,
            page: pageNum,
            limit: PAGE_SIZE,
          },
        });

        const fetchedConversations = res.data.conversations || [];
        setHasMore(res.data.hasMore);
        setPage(pageNum);

        if (isReset) {
          setConversations(fetchedConversations);
        } else {
          setConversations((prev) => {
            const existingRoomIds = new Set(prev.map((c) => c.roomId));
            const unique = fetchedConversations.filter(
              (c) => !existingRoomIds.has(c.roomId)
            );
            return [...prev, ...unique];
          });
        }
      } catch (err: any) {
        console.log('Fetch conversations error:', err);
        setError(
          err.response?.data?.message || err.message || 'Failed to fetch conversations'
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [currentId, refreshing]
  );

  // Reload when screen gains focus (e.g. after chatting or adding contact)
  useFocusEffect(
    useCallback(() => {
      fetchConversations(1, true);
    }, [fetchConversations])
  );

  // Socket listener for incoming messages to update conversation list in real time
  useEffect(() => {
    let isMounted = true;
    let socketInstance: any = null;

    const setupSocket = async () => {
      try {
        const socket = await initSocket();
        socketInstance = socket;

        socket.on('receiveMessage', (message: Message) => {
          if (!isMounted) return;

          setConversations((prev) => {
            const index = prev.findIndex((c) => c.roomId === message.roomId);
            if (index !== -1) {
              const updated = [...prev];
              const conv = { ...updated[index] };
              conv.lastMessage = {
                id: message.id,
                text: message.text,
                senderId: message.senderId,
                createdAt: message.createdAt || new Date().toISOString(),
              };
              // Move to top
              updated.splice(index, 1);
              return [conv, ...updated];
            } else {
              // If new conversation, refresh conversations
              fetchConversations(1, true);
              return prev;
            }
          });
        });
      } catch (err) {
        console.log('Socket setup error in HomeScreen:', err);
      }
    };

    setupSocket();

    return () => {
      isMounted = false;
      if (socketInstance) {
        socketInstance.off('receiveMessage');
      }
    };
  }, [fetchConversations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations(1, true);
  };

  const loadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    fetchConversations(page + 1, false);
  };

  const openChat = (conversation: Conversation) => {
    router.push({
      pathname: '/(main)/chat/[id]',
      params: {
        id: conversation.user.id,
        name: conversation.user.name,
      },
    } as any);
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header Profile Section */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.profileInfo}
          onPress={() => router.push('/(main)/profile' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {currentUser?.name?.trim() ? currentUser.name.trim()[0].toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.userName} numberOfLines={1}>
              {currentUser?.name || 'My Profile'}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {currentUser?.email || ''}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push('/(main)/profile' as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.profileButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Sub Header */}
      <View style={styles.subHeader}>
        <Text style={styles.subHeaderTitle}>Messages</Text>
        <TouchableOpacity
          style={styles.newChatHeaderButton}
          onPress={() => router.push('/(main)/chat/AddContact' as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.newChatHeaderButtonText}>+ New Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Error display */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => fetchConversations(1, true)}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Loading state */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.roomId}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
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
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                You haven't messaged anyone yet. Start a new chat with your contacts!
              </Text>
              <TouchableOpacity
                style={styles.startChatButton}
                onPress={() => router.push('/(main)/chat/AddContact' as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.startChatButtonText}>Find People / New Chat</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.conversationCard}
              onPress={() => openChat(item)}
              activeOpacity={0.7}
            >
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {item.user?.name?.trim()
                    ? item.user.name.trim()[0].toUpperCase()
                    : 'U'}
                </Text>
              </View>
              <View style={styles.conversationInfo}>
                <View style={styles.nameTimeRow}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {item.user?.name || 'Anonymous'}
                  </Text>
                  <Text style={styles.timeText}>
                    {formatTime(item.lastMessage?.createdAt)}
                  </Text>
                </View>
                <Text style={styles.lastMessageText} numberOfLines={1}>
                  {item.lastMessage?.senderId === currentId ? 'You: ' : ''}
                  {item.lastMessage?.text || 'No message'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Floating Action Button for AddContact / New Chat */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(main)/chat/AddContact' as any)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  nameContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  userEmail: {
    fontSize: 13,
    color: '#8E8E93',
  },
  profileButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#E8F2FF',
  },
  profileButtonText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  subHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  newChatHeaderButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  newChatHeaderButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 6,
    paddingBottom: 80,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  conversationInfo: {
    flex: 1,
  },
  nameTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  lastMessageText: {
    fontSize: 14,
    color: '#636366',
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
    lineHeight: 20,
    marginBottom: 20,
  },
  startChatButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startChatButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 32,
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