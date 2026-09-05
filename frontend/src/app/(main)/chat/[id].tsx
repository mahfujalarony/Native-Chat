import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { MessageBubble } from '../../../components/MessageBubble';
import { ChatInput } from '../../../components/ChatInput';
import { initSocket, getSocket } from '../../../services/socket';
import { Message } from '../../../types';
import { useAuthStore } from '../../../store/useAuthStore';
import api from '../../../services/api';

const PAGE_SIZE = 20;

export default function ChatScreen() {
  const { id: otherUserId, name: otherUserName } = useLocalSearchParams<{
    id: string;
    name?: string;
  }>();

  const currentUser = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // Compute consistent roomId between 2 users: e.g. "userA_userB"
  const currentId = currentUser?.id || (currentUser as any)?._id;
  const roomId =
    currentId && otherUserId
      ? [currentId, otherUserId].sort().join('_')
      : '';

  useEffect(() => {
    let socketInstance: any = null;
    let isMounted = true;

    const setupChat = async () => {
      if (!roomId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setHasMore(true);
      try {
        const res = await api.get<Message[]>(
          `/chat/rooms/${roomId}/messages?limit=${PAGE_SIZE}`
        );
        if (isMounted) {
          const initialMessages = res.data || [];
          setMessages(initialMessages);
          if (initialMessages.length < PAGE_SIZE) {
            setHasMore(false);
          }
        }
      } catch (error) {
        console.log('Failed to load message history:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }

      try {
        const socket = await initSocket();
        socketInstance = socket;

        // Join the private conversation room
        socket.emit('joinRoom', roomId);

        // Listen for incoming messages in this room
        socket.on('receiveMessage', (message: Message) => {
          if (message.roomId === roomId && isMounted) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === message.id)) return prev;
              // Inverted list: prepend latest message at index 0 (bottom of screen)
              return [message, ...prev];
            });
          }
        });
      } catch (error) {
        console.log('Socket setup error:', error);
      }
    };

    setupChat();

    return () => {
      isMounted = false;
      if (socketInstance) {
        socketInstance.off('receiveMessage');
      }
    };
  }, [roomId]);

  const loadMoreMessages = useCallback(async () => {
    if (loading || loadingMore || !hasMore || messages.length === 0 || !roomId) {
      return;
    }

    setLoadingMore(true);
    try {
      // The last item in inverted messages array is the oldest message currently loaded
      const oldestMessageId = messages[messages.length - 1]?.id;
      if (!oldestMessageId) return;

      const res = await api.get<Message[]>(
        `/chat/rooms/${roomId}/messages?limit=${PAGE_SIZE}&cursor=${oldestMessageId}`
      );

      const olderMessages = res.data || [];
      if (olderMessages.length < PAGE_SIZE) {
        setHasMore(false);
      }

      if (olderMessages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const uniqueNew = olderMessages.filter((m) => !existingIds.has(m.id));
          return [...prev, ...uniqueNew];
        });
      }
    } catch (error) {
      console.log('Failed to load more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, messages, roomId]);

  const handleSendMessage = async (text: string) => {
    if (!currentId || !otherUserId || !roomId) return;

    try {
      const socket = getSocket() || (await initSocket());

      socket.emit('sendMessage', {
        roomId,
        senderId: currentId,
        receiverId: otherUserId,
        text,
        status: 'pending',
      });
    } catch (err) {
      console.log('Send message error:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: otherUserName || 'Chat',
          headerBackTitle: 'Back',
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            inverted
            keyExtractor={(item, index) => item.id || index.toString()}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isMyMessage={item.senderId === currentUser?.id}
              />
            )}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.2}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color="#007AFF" />
                </View>
              ) : null
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={[styles.emptyContainer, { transform: [{ scaleY: -1 }] }]}>
                <Text style={styles.emptyText}>No messages yet.</Text>
                <Text style={styles.emptySubText}>
                  Say hi to {otherUserName || 'start the conversation'}! 👋
                </Text>
              </View>
            }
          />
        )}
        <ChatInput onSend={handleSendMessage} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMoreContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3A3A3C',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
