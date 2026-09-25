import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { guardianApi } from '../../api/client';

interface Message {
  id: string;
  type: 'user' | 'ai';
  text: string;
  evidence?: Array<{
    title: string;
    category: string;
    duration_min: number;
    topics: string[];
    summary: string;
  }>;
  confidence?: number;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  "What did he watch today?",
  "What cartoons did he watch?",
  "What did he learn about space?",
  "Was anything concerning?",
  "What educational content was watched?",
  "How much screen time today?",
];

export default function GuardianAiScreen() {
  const { selectedChildId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const askQuestion = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMsg: Message = {
      id: `msg_${Date.now()}_user`,
      type: 'user',
      text: question.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const result = await guardianApi.askAI(selectedChildId, question.trim());
      const aiMsg: Message = {
        id: `msg_${Date.now()}_ai`,
        type: 'ai',
        text: result.data?.answer || 'Sorry, I could not find relevant viewing data to answer that.',
        evidence: result.data?.evidence_sessions || [],
        confidence: result.data?.confidence,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      const errorMsg: Message = {
        id: `msg_${Date.now()}_error`,
        type: 'ai',
        text: 'Sorry, something went wrong. Please check your connection and try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Welcome State */}
        {messages.length === 0 && (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeIcon}>💡</Text>
            <Text style={styles.welcomeTitle}>Guardian AI Assistant</Text>
            <Text style={styles.welcomeDesc}>
              Ask anything about your child's viewing activity. I use verified evidence from today's sessions to give grounded answers.
            </Text>

            <Text style={styles.promptsLabel}>Suggested Questions:</Text>
            <View style={styles.promptsGrid}>
              {QUICK_PROMPTS.map((prompt, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.promptChip}
                  onPress={() => askQuestion(prompt)}
                >
                  <Text style={styles.promptText}>"{prompt}"</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Chat Messages */}
        {messages.map((msg) => (
          <View key={msg.id} style={[styles.msgBubble, msg.type === 'user' ? styles.userBubble : styles.aiBubble]}>
            {msg.type === 'ai' && <Text style={styles.aiAvatar}>🛡️</Text>}
            <View style={[styles.msgContent, msg.type === 'user' ? styles.userContent : styles.aiContent]}>
              <Text style={[styles.msgText, msg.type === 'user' ? styles.userText : styles.aiText]}>
                {msg.text}
              </Text>

              {/* Evidence Cards */}
              {msg.evidence && msg.evidence.length > 0 && (
                <View style={styles.evidenceContainer}>
                  <Text style={styles.evidenceLabel}>📋 Evidence Sources:</Text>
                  {msg.evidence.map((ev, i) => (
                    <View key={i} style={styles.evidenceCard}>
                      <Text style={styles.evidenceTitle}>{ev.title}</Text>
                      <View style={styles.evidenceMeta}>
                        <Text style={styles.evidenceCategory}>{ev.category}</Text>
                        <Text style={styles.evidenceDuration}>{ev.duration_min} min</Text>
                      </View>
                      {ev.topics && ev.topics.length > 0 && (
                        <View style={styles.evidenceTopics}>
                          {ev.topics.slice(0, 4).map((t, j) => (
                            <Text key={j} style={styles.evidenceTopicChip}>{t}</Text>
                          ))}
                        </View>
                      )}
                      {ev.summary && <Text style={styles.evidenceSummary}>{ev.summary}</Text>}
                    </View>
                  ))}
                </View>
              )}

              {/* Confidence */}
              {msg.confidence !== undefined && (
                <Text style={styles.confidenceText}>
                  Confidence: {Math.round(msg.confidence * 100)}%
                </Text>
              )}
            </View>
            {msg.type === 'user' && <Text style={styles.userAvatar}>👤</Text>}
          </View>
        ))}

        {/* Typing Indicator */}
        {isLoading && (
          <View style={[styles.msgBubble, styles.aiBubble]}>
            <Text style={styles.aiAvatar}>🛡️</Text>
            <View style={[styles.msgContent, styles.aiContent]}>
              <View style={styles.typingRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.typingText}>Guardian AI is thinking...</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        {messages.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.inlinePrompts}>
            {QUICK_PROMPTS.slice(0, 3).map((p, i) => (
              <TouchableOpacity key={i} style={styles.inlineChip} onPress={() => askQuestion(p)}>
                <Text style={styles.inlineChipText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask about today's viewing..."
            placeholderTextColor={Colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => askQuestion(inputText)}
            returnKeyType="send"
            multiline={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={() => askQuestion(inputText)}
            disabled={!inputText.trim() || isLoading}
          >
            <Text style={styles.sendText}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  chatArea: { flex: 1 },
  chatContent: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, paddingBottom: 20 },

  welcomeContainer: { alignItems: 'center', paddingTop: Spacing.xxl },
  welcomeIcon: { fontSize: 64, marginBottom: Spacing.md },
  welcomeTitle: { fontSize: FontSizes.title, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm },
  welcomeDesc: { fontSize: FontSizes.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing.md, marginBottom: Spacing.xl },
  promptsLabel: { fontSize: FontSizes.caption, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md, fontWeight: '600' },
  promptsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  promptChip: { backgroundColor: Colors.bgCard, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, borderWidth: 1, borderColor: Colors.border },
  promptText: { fontSize: FontSizes.body, color: Colors.accent, fontWeight: '500' },

  msgBubble: { flexDirection: 'row', marginBottom: Spacing.md, alignItems: 'flex-start', gap: Spacing.sm },
  userBubble: { justifyContent: 'flex-end' },
  aiBubble: { justifyContent: 'flex-start' },
  aiAvatar: { fontSize: 24, marginTop: 4 },
  userAvatar: { fontSize: 24, marginTop: 4 },
  msgContent: { maxWidth: '80%', borderRadius: BorderRadius.lg, padding: Spacing.md },
  userContent: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  aiContent: { backgroundColor: Colors.bgCard, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  msgText: { fontSize: FontSizes.body, lineHeight: 22 },
  userText: { color: Colors.textPrimary },
  aiText: { color: Colors.textSecondary },

  evidenceContainer: { marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  evidenceLabel: { fontSize: FontSizes.caption, color: Colors.textMuted, fontWeight: '600', marginBottom: Spacing.sm },
  evidenceCard: { backgroundColor: Colors.bgSurface, borderRadius: BorderRadius.sm, padding: Spacing.sm + 2, marginBottom: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  evidenceTitle: { fontSize: FontSizes.body, fontWeight: '700', color: Colors.textPrimary },
  evidenceMeta: { flexDirection: 'row', gap: Spacing.sm, marginTop: 2 },
  evidenceCategory: { fontSize: FontSizes.caption, color: Colors.accent },
  evidenceDuration: { fontSize: FontSizes.caption, color: Colors.textMuted },
  evidenceTopics: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  evidenceTopicChip: { fontSize: 10, color: Colors.primaryLight, backgroundColor: Colors.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  evidenceSummary: { fontSize: FontSizes.caption, color: Colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  confidenceText: { fontSize: FontSizes.caption, color: Colors.textMuted, marginTop: Spacing.sm },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  typingText: { fontSize: FontSizes.body, color: Colors.textMuted, fontStyle: 'italic' },

  inputBar: { borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.bgCard, paddingBottom: Platform.OS === 'ios' ? 30 : Spacing.md },
  inlinePrompts: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, maxHeight: 40 },
  inlineChip: { backgroundColor: Colors.bgSurface, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 6, marginRight: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  inlineChipText: { fontSize: FontSizes.caption, color: Colors.accent },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: Spacing.sm },
  input: { flex: 1, backgroundColor: Colors.bgInput, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4, fontSize: FontSizes.body, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { fontSize: 20, fontWeight: '900', color: '#FFF' },
});
