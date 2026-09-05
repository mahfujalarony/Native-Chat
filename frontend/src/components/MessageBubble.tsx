import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '../types';

interface Props {
  message: Message;
  isMyMessage: boolean;
}

export const MessageBubble: React.FC<Props> = ({ message, isMyMessage }) => {
  const formattedTime = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <View
      style={[
        styles.container,
        isMyMessage ? styles.myContainer : styles.otherContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isMyMessage ? styles.myBubble : styles.otherBubble,
        ]}
      >
        <Text style={[styles.text, isMyMessage ? styles.myText : styles.otherText]}>
          {message.text}
        </Text>
        {formattedTime ? (
          <Text
            style={[
              styles.time,
              isMyMessage ? styles.myTime : styles.otherTime,
            ]}
          >
            {formattedTime}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 12,
    flexDirection: 'row',
  },
  myContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E9E9EB',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  myText: {
    color: '#FFFFFF',
  },
  otherText: {
    color: '#000000',
  },
  time: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTime: {
    color: '#8E8E93',
  },
});