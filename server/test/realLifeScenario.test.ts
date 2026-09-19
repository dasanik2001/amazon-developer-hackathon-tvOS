import { db } from '../src/db/database.js';
import { analyzeContent, preheatContentCatalog } from '../src/services/aiPipeline.js';
import { getOrCreateDailyDigest } from '../src/services/digestService.js';
import { answerParentQuestion } from '../src/services/qaService.js';
import { ViewingSession } from '../src/types.js';

async function runRealLifeScenarioTest() {
  console.log('--- STARTING REAL-LIFE SCENARIO VERIFICATION TEST ---');

  // Step 1: Initialize database & preheat
  db.resetAll();
  await preheatContentCatalog();
  const children = db.getChildren();
  const aarav = children.find((c) => c.display_name === 'Aarav');
  if (!aarav) throw new Error('Child profile Aarav not found');
  console.log(`[PASS] Found child profile: ${aarav.display_name} (Age: ${aarav.age_band})`);

  const catalog = db.getAllContent();
  console.log(`[PASS] Loaded catalog with ${catalog.length} items`);

  // Step 2: Simulate Real Viewing Session 1 - Space Documentary (P0 Viewing session tracking)
  const today = new Date().toISOString().split('T')[0];
  const spaceDoc = catalog.find((c) => c.id === 'content_jwst_space')!;

  const session1: ViewingSession = {
    id: 'test_session_001',
    child_id: aarav.id,
    content_id: spaceDoc.id,
    title: spaceDoc.title,
    category: spaceDoc.category,
    started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    ended_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    duration_sec: 1500, // 25 minutes
    completed: true,
    timestamp: today,
  };

  db.recordSession(session1);
  console.log(`[PASS] Recorded Viewing Session 1: "${session1.title}" (25 mins)`);

  // Step 3: Verify Content Intelligence & Topic Extraction (P0)
  const analysis1 = await analyzeContent(spaceDoc);
  console.log(`[PASS] Content Intelligence for Space Doc:`);
  console.log(`       Topics: [${analysis1.topics.join(', ')}]`);
  console.log(`       Educational Score: ${analysis1.educational_score}/100`);
  console.log(`       Violence Signal: ${analysis1.violence_signal}`);
  console.log(`       Age Signal: ${analysis1.age_signal}`);

  if (!analysis1.topics.some((t) => t.includes('space') || t.includes('astronomy'))) {
    throw new Error('Topic extraction failed for space documentary');
  }

  // Step 4: Simulate Viewing Session 2 - Action Cartoon (with mild action flag)
  const actionCartoon = catalog.find((c) => c.id === 'content_city_rescue_action')!;
  const session2: ViewingSession = {
    id: 'test_session_002',
    child_id: aarav.id,
    content_id: actionCartoon.id,
    title: actionCartoon.title,
    category: actionCartoon.category,
    started_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    ended_at: new Date().toISOString(),
    duration_sec: 900, // 15 minutes
    completed: true,
    timestamp: today,
  };
  db.recordSession(session2);
  const analysis2 = await analyzeContent(actionCartoon);
  console.log(`[PASS] Recorded Viewing Session 2: "${session2.title}" (15 mins)`);
  console.log(`       Safety Signal: ${analysis2.violence_signal}`);

  // Step 5: Verify Daily Digest (P0)
  const digest = getOrCreateDailyDigest(aarav.id, today);
  console.log(`[PASS] Generated Daily Digest:`);
  console.log(`       Total Minutes: ${digest.total_minutes} min`);
  console.log(`       Category Breakdown:`, digest.category_minutes);
  console.log(`       Top Topics: [${digest.top_topics.join(', ')}]`);
  console.log(`       Notable Items: ${digest.notable_items.length}`);
  console.log(`       Briefing Summary: "${digest.generated_summary}"`);

  if (digest.total_minutes !== 40) {
    throw new Error(`Expected total_minutes to be 40, got ${digest.total_minutes}`);
  }

  // Step 6: Verify Parent Q&A (P0) - Grounded in Viewing Evidence
  console.log(`\n--- TESTING PARENT Q&A GROUNDED IN VIEWING EVIDENCE ---`);

  // Query A
  const q1 = 'What did Aarav watch today?';
  const a1 = await answerParentQuestion(aarav.id, q1, today);
  console.log(`Question: "${q1}"`);
  console.log(`Answer:   "${a1.answer}"`);
  console.log(`Evidence: ${a1.evidence_sessions.length} source session cards cited.\n`);
  if (a1.evidence_sessions.length !== 2) throw new Error('Expected 2 evidence cards');

  // Query B
  const q2 = 'Was anything concerning?';
  const a2 = await answerParentQuestion(aarav.id, q2, today);
  console.log(`Question: "${q2}"`);
  console.log(`Answer:   "${a2.answer}"`);
  console.log(`Evidence: ${a2.evidence_sessions.map((s) => s.title).join(', ')}\n`);
  if (!a2.answer.toLowerCase().includes('mild') && !a2.answer.toLowerCase().includes('action')) {
    throw new Error('Expected answer to address the action cartoon signal');
  }

  // Query C
  const q3 = 'What did he learn about space?';
  const a3 = await answerParentQuestion(aarav.id, q3, today);
  console.log(`Question: "${q3}"`);
  console.log(`Answer:   "${a3.answer}"`);
  console.log(`Evidence: ${a3.evidence_sessions.map((s) => s.title).join(', ')}\n`);
  if (!a3.answer.toLowerCase().includes('james webb') && !a3.answer.toLowerCase().includes('telescope')) {
    throw new Error('Expected space learning details in answer');
  }

  console.log('✅ ALL REAL-LIFE SCENARIO & P0 REQUIREMENTS VERIFIED SUCCESSFULLY!');
}

runRealLifeScenarioTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
