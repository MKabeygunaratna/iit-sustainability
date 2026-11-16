import { database, encrypt, protectIp } from "./server";
import type { PoolClient } from "pg";
import { questions, type Answers } from "./questions";

const samples = [
  ["Add clearly labelled recycling bins in every shared area.", "Show where different types of waste should go."],
  ["Use solar power and switch off unused lights after classes.", "A monthly energy dashboard would help."],
  ["Reduce single-use plastics in the cafeteria.", "Offer refill stations and reusable bottles."],
  ["Run short awareness workshops for new students.", "Promote activities through the student portal."],
  ["Introduce e-waste collection points for old devices.", "Partner with a certified recycling provider."],
  ["Fix leaking taps and monitor water use.", "Share simple water-saving reminders."],
  ["Create more green spaces around campus.", "Student volunteer planting days could help."],
  ["Publish clear sustainability goals and progress.", "Let students suggest ideas online."],
];
// RFC 5737 documentation addresses. Four pairs share an IP to demonstrate review.
const sampleIp = (index: number) => `192.0.2.${10 + (index < 8 ? Math.floor(index / 2) : index)}`;
function demoAnswers(index: number): Answers {
  const pick = (id: string, n: number) => questions.find(q => q.id === id)!.options![n % questions.find(q => q.id === id)!.options!.length];
  const [idea, suggestion] = samples[index % samples.length];
  return {
    q1: ["Student", "Student", "Student", "Academic staff", "Administrative staff"][index % 5],
    q2: pick("q2", index * 3), q3: pick("q3", 3 + index % 2),
    q4: pick("q4", index % 3), q5: ["No", "Not sure", "No", "Yes"][index % 4],
    q6: pick("q6", 1 + index % 3), q7: pick("q7", index % 4),
    q8: ["No", "Not sure", "Yes"][index % 3], q9: ["No", "Not sure", "No", "Yes"][index % 4],
    q10: pick("q10", 1 + index % 4),
    q11: [["Not enough recycling facilities", "Lack of awareness"], ["Not enough information", "Activities are not promoted enough"], ["Facilities are difficult to use or access"], ["Lack of time", "I am not sure what I can do"]][index % 4],
    q12: ["Waste and litter", "Electricity use", "Plastic use", "Lack of awareness", "Water use", "Disposal of old computers and electronic equipment"][index % 6],
    q13: [["Improving recycling", "Reducing plastic use", "Improving sustainability education and awareness"], ["Reducing electricity use", "Using renewable energy such as solar power", "Providing more information about sustainability progress"], ["Reducing water waste", "Increasing green areas", "Encouraging students and staff to participate"], ["Reusing or recycling old electronic equipment", "Using digital technology to support sustainability"]][index % 4],
    q14: ["Recycling and waste", "Energy use", "Plastic reduction", "Sustainability awareness", "Water use", "Electronic waste"][index % 6],
    q15: ["Definitely yes", "Probably yes", "Not sure", "Definitely yes"][index % 4],
    q16: [["Recycling and waste information", "Sustainability goals and progress"], ["Electricity use", "Water use", "A way to suggest new ideas"], ["Sustainability events and activities", "Tips on how to be more sustainable"], ["A way to report environmental problems", "Information about recycling old electronic equipment"]][index % 4],
    q17: ["Website/student portal", "Mobile app", "Social media", "Email", "Digital screens around campus"][index % 5],
    q18: ["Yes", "Maybe", "Yes", "No"][index % 4], q19: idea, q20: suggestion,
  };
}
async function insertSamples(client: PoolClient) {
  for (let i = 0; i < 24; i++) {
    const { iv, ciphertext } = encrypt(demoAnswers(i));
    const ip = protectIp(sampleIp(i));
    const date = new Date(Date.now() - (23 - i) * 86400000).toISOString();
    await client.query(`INSERT INTO responses (id, created_at, is_demo, iv, ciphertext, ip_hash, ip_iv, ip_ciphertext)
      VALUES ($1, $2, true, $3, $4, $5, $6, $7)`,
      [crypto.randomUUID(), date, iv, ciphertext, ip.ipHash, ip.ipIv, ip.ipCiphertext]);
  }
}

export async function seedSamples() {
  const client = await database().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('iit_demo_seed'))");
    const existing = await client.query("SELECT 1 FROM responses WHERE is_demo = true LIMIT 1");
    if (existing.rowCount) { await client.query("ROLLBACK"); return false; }
    await insertSamples(client);
    await client.query("COMMIT");
    return true;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function initializeDemo() {
  const client = await database().connect();
  try {
    await client.query("BEGIN");
    const state = await client.query(`INSERT INTO site_state (key, value) VALUES ('demo_initialized', 'yes')
      ON CONFLICT (key) DO NOTHING RETURNING key`);
    if (state.rowCount) await insertSamples(client);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
