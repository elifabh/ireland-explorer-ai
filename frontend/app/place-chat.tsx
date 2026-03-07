import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput,
  TouchableOpacity, FlatList, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../src/services/api';
import { useApp } from '../src/context/AppContext';
import { Colors, Typography, Spacing, Radius, Shadow } from '../src/theme';
import { ThemedHeader, IconCircle, AnimatedEntry } from '../src/components/ui';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function PlaceChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t, language } = useApp();
  const { placeId, placeName, lat, lng } = params;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: language === 'ga' ? `Fáilte! Cuir ceist orm faoi ${placeName || 'an áit seo'}.` : `Hello! I'm Cillian. Ask me anything about ${placeName || 'this place'}.`,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const sendMessage = async (text: string = inputText) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const chatHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const response = await api.chatWithPlace({
        place_id: placeId as string,
        place_name: placeName as string,
        lat: lat ? parseFloat(lat as string) : undefined,
        lon: lng ? parseFloat(lng as string) : undefined,
        user_message: userMsg.content,
        chat_history: chatHistory,
      });

      const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: response.answer };
      setMessages((prev) => [...prev, assistantMsg]);

      if (isRecording) { speak(response.answer); }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: t('errorOccurred') || 'Sorry, I encountered an error.' };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow microphone access to use voice chat.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) { console.error('Failed to start recording', err); }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      if (!uri) return;
      setIsLoading(true);
      const result = await api.transcribeAudio("mock-audio-base64");
      setIsLoading(false);
      if (result.text) { sendMessage(result.text); }
      recordingRef.current = null;
    } catch (err) { console.error('Failed to stop recording', err); setIsLoading(false); }
  };

  const speak = (text: string) => {
    if (isSpeaking) { Speech.stop(); setIsSpeaking(false); }
    else {
      setIsSpeaking(true);
      Speech.speak(text, { onDone: () => setIsSpeaking(false), onStopped: () => setIsSpeaking(false) });
    }
  };

  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ThemedHeader
        title={placeName as string || 'Place Chat'}
        subtitle={language === 'ga' ? 'Ag caint le Cillian' : 'Chat with Cillian'}
        onBack={() => router.back()}
        rightComponent={
          <IconCircle icon="chatbubbles" color={Colors.goldBright} bgColor="rgba(255,255,255,0.15)" size={20} />
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <AnimatedEntry delay={50}>
              <View style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                <Text style={[styles.messageText, item.role === 'user' ? styles.userText : styles.assistantText]}>
                  {item.content.split(/(\*\*.*?\*\*)/g).map((part: string, index: number) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <Text key={index} style={{ fontWeight: '800' }}>{part.slice(2, -2)}</Text>;
                    }
                    return <Text key={index}>{part}</Text>;
                  })}
                </Text>
              </View>
            </AnimatedEntry>
          )}
        />

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.emeraldBright} />
            <Text style={styles.loadingText}>{language === 'ga' ? 'Ag smaoineamh...' : 'Thinking...'}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={language === 'ga' ? 'Cuir ceist...' : 'Ask a question...'}
            placeholderTextColor={Colors.slate}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
          />
          {inputText.trim() ? (
            <TouchableOpacity onPress={() => sendMessage(inputText)} style={styles.sendBtn} disabled={isLoading}>
              <LinearGradient colors={['#059669', '#047857']} style={styles.actionBtnCircle}>
                <Ionicons name="send" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPressIn={startRecording} onPressOut={stopRecording} style={styles.micBtn} disabled={isLoading}>
              <LinearGradient colors={isRecording ? ['#EF4444', '#B91C1C'] : ['#3B82F6', '#2563EB']} style={[styles.actionBtnCircle, isRecording && styles.micBtnActive]}>
                <Ionicons name={isRecording ? "mic" : "mic-outline"} size={22} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.offWhite },
  keyboardView: { flex: 1 },
  messagesList: { padding: 16, paddingBottom: 24 },
  messageBubble: { maxWidth: '85%', padding: 14, borderRadius: 20, marginBottom: 12, ...Shadow.sm },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.emeraldBright, borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.mist },
  messageText: { fontSize: Typography.base, lineHeight: 22 },
  userText: { color: '#fff', fontWeight: '500' },
  assistantText: { color: Colors.dark },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12, gap: 8 },
  loadingText: { fontSize: Typography.sm, color: Colors.slate, fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: Platform.OS === 'ios' ? 30 : 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: Colors.mist, gap: 10 },
  input: { flex: 1, height: 46, backgroundColor: Colors.offWhite, borderRadius: 23, paddingHorizontal: 18, fontSize: Typography.base, color: Colors.dark, borderWidth: 1, borderColor: Colors.mist },
  actionBtnCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', ...Shadow.md },
  sendBtn: {},
  micBtn: {},
  micBtnActive: { transform: [{ scale: 1.1 }] },
});
