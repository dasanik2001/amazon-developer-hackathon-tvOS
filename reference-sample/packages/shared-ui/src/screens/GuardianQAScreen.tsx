import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SpatialNavigationRoot, SpatialNavigationFocusableView, DefaultFocus } from 'react-tv-space-navigation';
import { useIsFocused } from '@react-navigation/native';
import { colors, safeZones } from '../theme';
import { scaledPixels } from '../hooks/useScale';
import { askGuardianAI, GuardianQAResult } from '../services/guardianApi';

const SUGGESTED_QUESTIONS = [
  'What did Aarav watch today?',
  'What did he learn about space?',
  'Was anything concerning?',
  'What educational content did he watch?',
];

export default function GuardianQAScreen() {
  const isFocused = useIsFocused();
  const [activeQuestion, setActiveQuestion] = useState<string>('');
  const [qaResult, setQaResult] = useState<GuardianQAResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleAsk = async (question: string) => {
    setActiveQuestion(question);
    setLoading(true);
    setQaResult(null);
    const res = await askGuardianAI(question, 'child_aarav');
    setQaResult(res);
    setLoading(false);
  };

  return (
    <SpatialNavigationRoot isActive={isFocused}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.badge}>GROUNDED RETRIEVAL-AUGMENTED ASSISTANT</Text>
          <Text style={styles.title}>Ask Guardian AI</Text>
          <Text style={styles.subtitle}>
            Pose natural questions about Aarav's viewing sessions, topics, and safety signals.
          </Text>
        </View>

        {/* Suggested Prompts Grid */}
        <Text style={styles.sectionLabel}>SELECT A TOPIC OR QUESTION:</Text>
        <View style={styles.promptsContainer}>
          {SUGGESTED_QUESTIONS.map((q, idx) => {
            const isDefault = idx === 0;
            const content = (
              <SpatialNavigationFocusableView key={idx} onSelect={() => handleAsk(q)}>
                {({ isFocused: btnFocused }) => (
                  <View
                    style={[
                      styles.promptBtn,
                      btnFocused && styles.promptBtnFocused,
                      activeQuestion === q && styles.promptBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.promptBtnText,
                        btnFocused && styles.promptBtnTextFocused,
                        activeQuestion === q && styles.promptBtnTextActive,
                      ]}
                    >
                      💬 {q}
                    </Text>
                  </View>
                )}
              </SpatialNavigationFocusableView>
            );

            return isDefault ? <DefaultFocus key={idx}>{content}</DefaultFocus> : content;
          })}
        </View>

        {/* Answer Box */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#ff9900" />
            <Text style={styles.loadingText}>Retrieving viewing logs & synthesizing answer...</Text>
          </View>
        )}

        {qaResult && (
          <View style={styles.answerContainer}>
            <View style={styles.answerHeader}>
              <Text style={styles.answerLabel}>AI GUARDIAN RESPONSE</Text>
              <Text style={styles.questionEcho}>"{qaResult.question}"</Text>
            </View>

            <Text style={styles.answerText}>{qaResult.answer}</Text>

            {/* Evidence Cards */}
            {qaResult.evidence_sessions && qaResult.evidence_sessions.length > 0 && (
              <View style={styles.evidenceSection}>
                <Text style={styles.evidenceSectionTitle}>
                  CITED VIEWING EVIDENCE ({qaResult.evidence_sessions.length} sessions)
                </Text>
                {qaResult.evidence_sessions.map((ev, i) => (
                  <View key={i} style={styles.evidenceCard}>
                    <Text style={styles.evidenceTitle}>🎬 {ev.title}</Text>
                    <Text style={styles.evidenceMeta}>
                      Category: {ev.category} • Watched: {ev.duration_min} min • Topics:{' '}
                      {ev.topics.join(', ') || 'General'}
                    </Text>
                    {ev.summary ? <Text style={styles.evidenceSummary}>{ev.summary}</Text> : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  contentContainer: {
    paddingStart: safeZones.left,
    paddingEnd: safeZones.right,
    paddingTop: safeZones.top,
    paddingBottom: scaledPixels(40),
  },
  header: {
    marginBottom: scaledPixels(24),
  },
  badge: {
    color: '#ff9900',
    fontSize: scaledPixels(13),
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: scaledPixels(32),
    fontWeight: '800',
    color: '#ffffff',
    marginTop: scaledPixels(4),
  },
  subtitle: {
    fontSize: scaledPixels(16),
    color: '#94a3b8',
    marginTop: scaledPixels(4),
  },
  sectionLabel: {
    color: '#64748b',
    fontSize: scaledPixels(12),
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: scaledPixels(12),
  },
  promptsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaledPixels(12),
    marginBottom: scaledPixels(24),
  },
  promptBtn: {
    backgroundColor: '#131c2e',
    paddingVertical: scaledPixels(12),
    paddingHorizontal: scaledPixels(18),
    borderRadius: scaledPixels(10),
    borderWidth: 1,
    borderColor: '#2a3754',
  },
  promptBtnFocused: {
    backgroundColor: '#ff9900',
    borderColor: '#ffaa22',
  },
  promptBtnActive: {
    borderColor: '#38bdf8',
  },
  promptBtnText: {
    color: '#e2e8f0',
    fontSize: scaledPixels(15),
    fontWeight: '600',
  },
  promptBtnTextFocused: {
    color: '#0b0f19',
    fontWeight: '800',
  },
  promptBtnTextActive: {
    color: '#38bdf8',
  },
  loadingBox: {
    padding: scaledPixels(40),
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: scaledPixels(16),
    marginTop: scaledPixels(12),
  },
  answerContainer: {
    backgroundColor: '#131c2e',
    borderRadius: scaledPixels(14),
    padding: scaledPixels(24),
    borderLeftWidth: 5,
    borderLeftColor: '#38bdf8',
  },
  answerHeader: {
    marginBottom: scaledPixels(12),
  },
  answerLabel: {
    color: '#38bdf8',
    fontSize: scaledPixels(12),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  questionEcho: {
    color: '#f8fafc',
    fontSize: scaledPixels(18),
    fontWeight: '700',
    marginTop: scaledPixels(2),
  },
  answerText: {
    fontSize: scaledPixels(17),
    lineHeight: scaledPixels(26),
    color: '#ffffff',
    marginBottom: scaledPixels(20),
  },
  evidenceSection: {
    borderTopWidth: 1,
    borderTopColor: '#2a3754',
    paddingTop: scaledPixels(16),
  },
  evidenceSectionTitle: {
    color: '#94a3b8',
    fontSize: scaledPixels(12),
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: scaledPixels(10),
  },
  evidenceCard: {
    backgroundColor: '#0b0f19',
    padding: scaledPixels(14),
    borderRadius: scaledPixels(8),
    borderLeftWidth: 3,
    borderLeftColor: '#34d399',
    marginBottom: scaledPixels(8),
  },
  evidenceTitle: {
    color: '#ffffff',
    fontSize: scaledPixels(15),
    fontWeight: '700',
  },
  evidenceMeta: {
    color: '#94a3b8',
    fontSize: scaledPixels(13),
    marginTop: scaledPixels(2),
  },
  evidenceSummary: {
    color: '#cbd5e1',
    fontSize: scaledPixels(13),
    marginTop: scaledPixels(6),
    fontStyle: 'italic',
  },
});
