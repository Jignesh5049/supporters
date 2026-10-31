import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Paperclip, Send } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import { pickAndCompressImageAsync } from '../../../lib/media/imagePicker';

export interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  onSendAttachment: (uri: string) => void;
  onTypingChange?: (isTyping: boolean) => void;
}

export function ChatInputBar({
  onSendMessage,
  onSendAttachment,
  onTypingChange,
}: ChatInputBarProps) {
  const [inputText, setInputText] = useState('');
  const [isAttaching, setIsAttaching] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTextChange = (text: string) => {
    setInputText(text);

    if (onTypingChange) {
      onTypingChange(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTypingChange(false);
      }, 2000);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
    if (onTypingChange) onTypingChange(false);
  };

  const handlePickAttachment = async () => {
    setIsAttaching(true);
    try {
      const result = await pickAndCompressImageAsync({ aspect: [4, 3] });
      if (result?.uri) {
        onSendAttachment(result.uri);
      }
    } catch {
      // Ignored
    } finally {
      setIsAttaching(false);
    }
  };

  return (
    <View style={styles.inputBar}>
      <TouchableOpacity
        style={styles.attachBtn}
        onPress={handlePickAttachment}
        disabled={isAttaching}
        accessibilityLabel="Attach photo"
      >
        {isAttaching ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Paperclip size={20} color={colors.textSecondary} />
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Type trade enquiry or message..."
        placeholderTextColor="#9CA3AF"
        value={inputText}
        onChangeText={handleTextChange}
        multiline
        maxLength={1000}
      />

      <TouchableOpacity
        style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={!inputText.trim()}
        accessibilityLabel="Send message"
      >
        <Send size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  attachBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
});
