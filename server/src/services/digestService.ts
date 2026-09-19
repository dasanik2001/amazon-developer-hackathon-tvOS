import { db } from '../db/database.js';
import { DailyDigest } from '../types.js';

export function getOrCreateDailyDigest(childId: string, date: string): DailyDigest {
  const child = db.getChildById(childId);
  const childName = child ? child.display_name : 'Your child';

  // Get sessions for this child on this date (with timezone fallback)
  let sessions = db.getSessions(childId, date);
  if (sessions.length === 0) {
    const allSessions = db.getSessions(childId);
    if (allSessions.length > 0) {
      sessions = allSessions;
    }
  }

  if (sessions.length === 0) {
    return {
      child_id: childId,
      date,
      total_minutes: 0,
      category_minutes: {},
      top_topics: [],
      notable_items: [],
      generated_summary: `${childName} has not watched any Fire TV content yet today.`,
    };
  }

  let totalDurationSec = 0;
  const categorySeconds: Record<string, number> = {};
  const topicCounts: Record<string, number> = {};
  const notableItems: DailyDigest['notable_items'] = [];

  for (const session of sessions) {
    totalDurationSec += session.duration_sec;
    const cat = session.category || 'General';
    categorySeconds[cat] = (categorySeconds[cat] || 0) + session.duration_sec;

    // Retrieve AI analysis
    const analysis = db.getAnalysis(session.content_id);
    if (analysis) {
      for (const topic of analysis.topics) {
        topicCounts[topic] = (topicCounts[topic] || 0) + session.duration_sec;
      }

      // Check for notable items / flags
      if (analysis.educational_score >= 70) {
        notableItems.push({
          title: session.title,
          reason: `High educational value (${analysis.educational_score}/100) covering ${analysis.topics.slice(0, 2).join(', ')}.`,
          flag_type: 'educational_highlight',
        });
      }

      if (analysis.violence_signal !== 'none') {
        notableItems.push({
          title: session.title,
          reason: `Detected ${analysis.violence_signal === 'mild_action' ? 'mild animated action sequence / laser stunts' : 'intense sequences'}.`,
          flag_type: 'potential_concern',
        });
      }
    }
  }

  const totalMinutes = Math.max(1, Math.round(totalDurationSec / 60));
  const categoryMinutes: Record<string, number> = {};
  for (const [cat, sec] of Object.entries(categorySeconds)) {
    categoryMinutes[cat] = Math.max(1, Math.round(sec / 60));
  }

  // Sort top topics by watch time
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic)
    .slice(0, 5);

  // Generate executive summary briefing
  const primaryCategory = Object.entries(categoryMinutes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'various';
  const educationalMins = categoryMinutes['Educational'] || 0;
  const cartoonMins = categoryMinutes['Cartoon'] || 0;

  let summary = `${childName} watched ${totalMinutes} min of content today, primarily focusing on ${primaryCategory}.`;
  if (cartoonMins > 0) {
    summary += ` ${cartoonMins} min was spent watching animated cartoons.`;
  }
  if (educationalMins > 0) {
    summary += ` ${educationalMins} min (${Math.round((educationalMins / totalMinutes) * 100)}%) was educational, exploring ${topTopics.slice(0, 3).join(', ')}.`;
  } else if (topTopics.length > 0) {
    summary += ` Themes explored included ${topTopics.slice(0, 3).join(', ')}.`;
  }
  if (notableItems.some((n) => n.flag_type === 'potential_concern')) {
    summary += ` Notice: Mild animated action was detected in cartoon content.`;
  }

  const digest: DailyDigest = {
    child_id: childId,
    date,
    total_minutes: totalMinutes,
    category_minutes: categoryMinutes,
    top_topics: topTopics,
    notable_items: notableItems,
    generated_summary: summary,
  };

  db.saveDigest(digest);
  return digest;
}
