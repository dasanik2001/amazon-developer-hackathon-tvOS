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
import Icon from '../../components/Icon';

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
            <View style={styles.welcomeBadge}>
              <Icon name="sparkles" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.welcomeTitle}>Guardian AI Assistant</Text>
            <Text style={styles.welcomeDesc}>
              Ask anything about your child's viewing activity. Answers are grounded in verified evidence from today's sessions.
            </Text>

            <Text style={styles.promptsLabel}>SUGGESTED QUESTIONS</Text>
            <View style={styles.promptsGrid}>
              {QUICK_PROMPTS.map((prompt, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.promptChip}
                  onPress={() => askQuestion(prompt)}
                  accessibilityRole="button"
                >
                  <Text style={styles.promptText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Chat Messages */}
        {messages.map((msg) => (
          <View key={msg.id} style={[styles.msgBubble, msg.type === 'user' ? styles.userBubble : styles.aiBubble]}>
            {msg.type === 'ai' && (
              <View style={[styles.avatar, styles.aiAvatar]}>
                <Icon name="shield-checkmark" size={14} color="#FFFFFF" />
              </View>
            )}
            <View style={[styles.msgContent, msg.type === 'user' ? styles.userContent : styles.aiContent]}>
              <Text style={[styles.msgText, msg.type === 'user' ? styles.userText : styles.aiText]}>
                {msg.text}
              </Text>

              {/* Evidence Cards */}
              {msg.evidence && msg.evidence.length > 0 && (
                <View style={styles.evidenceContainer}>
                  <View style={styles.evidenceLabelRow}>
                    <Icon name="document-text" size={12} color={Colors.textMuted} />
                    <Text style={styles.evidenceLabel}>Evidence Sources</Text>
                  </View>
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
            {msg.type === 'user' && (
              <View style={[styles.avatar, styles.userAvatar]}>
                <Icon name="person" size={14} color="#FFFFFF" />
              </View>
            )}
          </View>
        ))}

        {/* Typing Indicator */}
        {isLoading && (
          <View style={[styles.msgBubble, styles.aiBubble]}>
            <View style={[styles.avatar, styles.aiAvatar]}>
              <Icon name="shield-checkmark" size={14} color="#FFFFFF" />
            </View>
            <View style={[styles.msgContent, styles.aiContent]}>
              <View style={styles.typingRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.typingText}>Guardian AI is thinking</Text>
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
              <TouchableOpacity key={i} style={styles.inlineChip} onPress={() => askQuestion(p)} accessibilityRole="button">
                <Text style={styles.inlineChipText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask about today's viewing..."
            placeholderTextColor={Colors.textPlaceholder}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => askQuestion(inputText)}
            returnKeyType="send"
            multiline={false}
            accessibilityLabel="Message"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={() => askQuestion(inputText)}
            disabled={!inputText.trim() || isLoading}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Icon name="arrow-up" size={20} color="#FFFFFF" />
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
  welcomeBadge: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: Colors.tintBlue,
    borderWidth: 1.5,
    borderColor: Colors.tintBlueStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  welcomeTitle: { fontSize: FontSizes.title, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm },
  welcomeDesc: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
  },
  promptsLabel: {
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing.md,
    fontWeight: '700',
  },
  promptsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  promptChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 42,
    justifyContent: 'center',
    ...Shadows.card,
  },
  promptText: { fontSize: FontSizes.body, color: Colors.primary, fontWeight: '600' },

  msgBubble: { flexDirection: 'row', marginBottom: Spacing.md, alignItems: 'flex-start', gap: Spacing.sm },
  userBubble: { justifyContent: 'flex-end' },
  aiBubble: { justifyContent: 'flex-start' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  aiAvatar: { backgroundColor: Colors.primary },
  userAvatar: { backgroundColor: '#64748B' },
  msgContent: { maxWidth: '80%', borderRadius: BorderRadius.lg, padding: Spacing.md },
  userContent: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  aiContent: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  msgText: { fontSize: FontSizes.body, lineHeight: 21 },
  userText: { color: '#FFFFFF' },
  aiText: { color: Colors.textSecondary },

  evidenceContainer: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  evidenceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  evidenceLabel: { fontSize: FontSizes.caption, color: Colors.textMuted, fontWeight: '700', letterSpacing: 0.4 },
  evidenceCard: {
    backgroundColor: Colors.bgSurface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm + 4,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  evidenceTitle: { fontSize: FontSizes.body, fontWeight: '700', color: Colors.textPrimary },
  evidenceMeta: { flexDirection: 'row', gap: Spacing.sm, marginTop: 3 },
  evidenceCategory: { fontSize: FontSizes.caption, color: Colors.primary, fontWeight: '600' },
  evidenceDuration: { fontSize: FontSizes.caption, color: Colors.textMuted },
  evidenceTopics: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  evidenceTopicChip: {
    fontSize: 10,
    color: Colors.primaryDark,
    backgroundColor: Colors.tintBlue,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    overflow: 'hidden',
  },
  evidenceSummary: { fontSize: FontSizes.caption, color: Colors.textMuted, marginTop: 5, fontStyle: 'italic', lineHeight: 16 },
  confidenceText: { fontSize: FontSizes.caption, color: Colors.textMuted, marginTop: Spacing.sm, fontWeight: '600' },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  typingText: { fontSize: FontSizes.body, color: Colors.textMuted, fontStyle: 'italic' },

  inputBar: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: '#FFFFFF',
    paddingBottom: Platform.OS === 'ios' ? 30 : Spacing.md,
  },
  inlinePrompts: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, maxHeight: 44 },
  inlineChip: {
    backgroundColor: Colors.tintBlue,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.tintBlueStrong,
    minHeight: 32,
    justifyContent: 'center',
  },
  inlineChipText: { fontSize: FontSizes.caption, color: Colors.primary, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.bgSurface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    fontSize: FontSizes.body,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 46,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.glow,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
