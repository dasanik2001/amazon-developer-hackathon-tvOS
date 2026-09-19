import { db } from '../src/db/database.js';
import { analyzeFrameContext } from '../src/services/aiPipeline.js';
import { getOrCreateDailyDigest } from '../src/services/digestService.js';
import { answerParentQuestion } from '../src/services/qaService.js';
import { FrameContext, ViewingSession } from '../src/types.js';

async function testOverlayIngestion() {
  console.log('===========================================================');
  console.log('🧪 RUNNING FIRE TV OS OVERLAY & 2-MIN INGESTION TEST');
  console.log('===========================================================');

  db.resetAll();
  const today = new Date().toISOString().split('T')[0];
  const childId = 'child_aarav';

  // Sample 1: YouTube 2-min frame ingestion (Space topic)
  console.log('\n[1] Emitting 2-min Frame Sample from YouTube (com.google.android.youtube.tv)...');
  const ytTitle = 'Hubble vs James Webb: The Cosmic Breakthrough';
  const ytSnippets = ['NASA Astrophysics', 'Infrared Galaxy Clusters', 'Subscribe to NASA Channel'];
  const ytAnalysis = await analyzeFrameContext('YouTube', 'com.google.android.youtube.tv', ytTitle, ytSnippets);

  const frame1: FrameContext = {
    id: 'frame_test_001',
    child_id: childId,
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    app_package: 'com.google.android.youtube.tv',
    app_name: 'YouTube',
    media_title: ytTitle,
    text_snippets: ytSnippets,
    analysis: ytAnalysis,
  };
  db.recordFrame(frame1);

  // Record 2-min session
  const contentId1 = 'ext_youtube_space';
  db.saveAnalysis({ ...ytAnalysis, content_id: contentId1 });
  const session1: ViewingSession = {
    id: 'session_yt_1',
    child_id: childId,
    content_id: contentId1,
    title: `${ytTitle} [YouTube]`,
    category: ytAnalysis.categories[0],
    started_at: frame1.timestamp,
    ended_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    duration_sec: 120, // 2 mins
    completed: false,
    timestamp: today,
  };
  db.recordSession(session1);
  console.log(`    ✅ Extracted Topics: [${ytAnalysis.topics.join(', ')}]`);
  console.log(`    ✅ Educational Score: ${ytAnalysis.educational_score}/100`);

  // Sample 2: Second 2-min Frame Sample extending YouTube viewing (+120 sec)
  console.log('\n[2] Emitting 2nd 2-min Frame Sample extending YouTube viewing (+120s)...');
  session1.duration_sec += 120; // total 4 mins (240s)
  session1.ended_at = new Date().toISOString();
  db.recordSession(session1);

  // Sample 3: Netflix 2-min frame ingestion (Paw Patrol / Cartoon)
  console.log('\n[3] User switches to Netflix (com.netflix.ninja). Emitting 2-min Frame Sample...');
  const netflixTitle = 'Paw Patrol: Adventure City Laughs';
  const netflixSnippets = ['Season 4 Episode 2', 'Chase and Marshall save the farm', 'Kids cartoon'];
  const netflixAnalysis = await analyzeFrameContext('Netflix', 'com.netflix.ninja', netflixTitle, netflixSnippets);

  const frame2: FrameContext = {
    id: 'frame_test_002',
    child_id: childId,
    timestamp: new Date().toISOString(),
    app_package: 'com.netflix.ninja',
    app_name: 'Netflix',
    media_title: netflixTitle,
    text_snippets: netflixSnippets,
    analysis: netflixAnalysis,
  };
  db.recordFrame(frame2);

  const contentId2 = 'ext_netflix_pawpatrol';
  db.saveAnalysis({ ...netflixAnalysis, content_id: contentId2 });
  const session2: ViewingSession = {
    id: 'session_netflix_1',
    child_id: childId,
    content_id: contentId2,
    title: `${netflixTitle} [Netflix]`,
    category: netflixAnalysis.categories[0],
    started_at: frame2.timestamp,
    ended_at: frame2.timestamp,
    duration_sec: 120, // 2 mins
    completed: false,
    timestamp: today,
  };
  db.recordSession(session2);
  console.log(`    ✅ Extracted Category: ${netflixAnalysis.categories.join(', ')}`);
  console.log(`    ✅ Topics: [${netflixAnalysis.topics.join(', ')}]`);

  // Sample 4: Prime Video 2-min frame ingestion (Whales)
  console.log('\n[4] User switches to Prime Video (com.amazon.amazonvideo.livingroom)...');
  const primeTitle = 'Deep Ocean Odyssey: Whales of the Antarctic';
  const primeSnippets = ['Prime Original Nature', 'Marine biologists record underwater whale songs'];
  const primeAnalysis = await analyzeFrameContext('Prime Video', 'com.amazon.amazonvideo.livingroom', primeTitle, primeSnippets);

  const contentId3 = 'ext_prime_ocean';
  db.saveAnalysis({ ...primeAnalysis, content_id: contentId3 });
  const session3: ViewingSession = {
    id: 'session_prime_1',
    child_id: childId,
    content_id: contentId3,
    title: `${primeTitle} [Prime Video]`,
    category: primeAnalysis.categories[0],
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    duration_sec: 240, // 4 mins
    completed: false,
    timestamp: today,
  };
  db.recordSession(session3);

  // Step 5: Verify Daily Digest Aggregation
  console.log('\n[5] Verifying Daily Digest across all monitored Fire TV OS apps...');
  const digest = getOrCreateDailyDigest(childId, today);
  console.log(`    Total Screen Time: ${digest.total_minutes} min`);
  console.log(`    Category Mix:`, digest.category_minutes);
  console.log(`    Top Topics: [${digest.top_topics.join(', ')}]`);
  console.log(`    Digest Summary: "${digest.generated_summary}"`);

  // Step 6: Test Grounded Parent Q&A queries for external apps
  console.log('\n[6] Testing Grounded Parent Q&A for External Apps:');

  const q1 = 'What did Aarav watch on YouTube?';
  const a1 = await answerParentQuestion(childId, q1, today);
  console.log(`    Q: "${q1}"`);
  console.log(`    A: "${a1.answer}"`);
  console.log(`    Evidence: ${a1.evidence_sessions.map((s) => s.title).join(', ')}\n`);
  if (!a1.answer.includes('YouTube') || !a1.answer.includes('Hubble')) {
    throw new Error('Failed to ground YouTube question');
  }

  const q2 = 'Did he watch Netflix today?';
  const a2 = await answerParentQuestion(childId, q2, today);
  console.log(`    Q: "${q2}"`);
  console.log(`    A: "${a2.answer}"`);
  console.log(`    Evidence: ${a2.evidence_sessions.map((s) => s.title).join(', ')}\n`);
  if (!a2.answer.includes('Netflix') || !a2.answer.includes('Paw Patrol')) {
    throw new Error('Failed to ground Netflix question');
  }

  const q3 = 'What educational content did he watch?';
  const a3 = await answerParentQuestion(childId, q3, today);
  console.log(`    Q: "${q3}"`);
  console.log(`    A: "${a3.answer}"`);
  console.log(`    Evidence: ${a3.evidence_sessions.map((s) => s.title).join(', ')}\n`);

  console.log('🎉 ALL OVERLAY & 2-MINUTE INGESTION TESTS PASSED SUCCESSFULLY!');
}

testOverlayIngestion().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
