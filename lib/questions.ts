export type Question = { id: string; text: string; type: "single" | "multi" | "text"; options?: string[]; max?: number; optional?: boolean };
export const sections: { label: string; eyebrow: string; questions: Question[] }[] = [
  { label: "About you", eyebrow: "01 / Your connection", questions: [
    { id: "q1", text: "What is your connection to IIT?", type: "single", options: ["Student", "Academic staff", "Administrative staff", "Other"] },
    { id: "q2", text: "How long have you been at IIT?", type: "single", options: ["Less than 1 year", "1–2 years", "3–4 years", "More than 4 years"] },
  ] },
  { label: "Awareness", eyebrow: "02 / General awareness", questions: [
    { id: "q3", text: "How important do you think sustainability is for IIT?", type: "single", options: ["Not important", "Slightly important", "Moderately important", "Very important", "Extremely important"] },
    { id: "q4", text: "How much do you know about IIT's current sustainability activities?", type: "single", options: ["Nothing", "A little", "Some", "A lot", "Very much"] },
    { id: "q5", text: "Do you think IIT communicates enough about its sustainability activities?", type: "single", options: ["Yes", "No", "Not sure"] },
  ] },
  { label: "Current situation", eyebrow: "03 / Life on campus", questions: [
    { id: "q6", text: "How would you rate IIT's current efforts to protect the environment?", type: "single", options: ["Very poor", "Poor", "Average", "Good", "Excellent"] },
    { id: "q7", text: "How would you rate the recycling and waste-disposal facilities available at IIT?", type: "single", options: ["Very poor", "Poor", "Average", "Good", "Excellent", "Not sure"] },
    { id: "q8", text: "Do you think IIT does enough to reduce unnecessary use of electricity and water?", type: "single", options: ["Yes", "No", "Not sure"] },
    { id: "q9", text: "Do you think students and staff are encouraged enough to take part in sustainability activities?", type: "single", options: ["Yes", "No", "Not sure"] },
    { id: "q10", text: "Do you personally try to reduce waste, save electricity or water, or recycle while at IIT?", type: "single", options: ["Never", "Rarely", "Sometimes", "Often", "Always"] },
  ] },
  { label: "Problems & priorities", eyebrow: "04 / What needs to change", questions: [
    { id: "q11", text: "What makes it difficult for people to behave more sustainably at IIT?", type: "multi", options: ["Not enough information", "Not enough recycling facilities", "Lack of awareness", "Lack of time", "Lack of interest", "Activities are not promoted enough", "Facilities are difficult to use or access", "I am not sure what I can do", "Other", "None"] },
    { id: "q12", text: "What do you think is the biggest sustainability-related problem at IIT?", type: "single", options: ["Waste and litter", "Electricity use", "Water use", "Plastic use", "Disposal of old computers and electronic equipment", "Lack of awareness", "Lack of student/staff participation", "Lack of information about IIT's sustainability progress", "Other"] },
    { id: "q13", text: "Which areas should IIT focus on most in the future?", type: "multi", max: 3, options: ["Reducing electricity use", "Using renewable energy such as solar power", "Improving recycling", "Reducing plastic use", "Reducing water waste", "Reusing or recycling old electronic equipment", "Increasing green areas", "Improving sustainability education and awareness", "Encouraging students and staff to participate", "Providing more information about sustainability progress", "Using digital technology to support sustainability", "Other"] },
    { id: "q14", text: "If IIT could improve only ONE area first, which one should it be?", type: "single", options: ["Energy use", "Recycling and waste", "Plastic reduction", "Water use", "Electronic waste", "Green spaces", "Sustainability awareness", "Student and staff participation", "Sustainability information and reporting", "Digital sustainability tools", "Other"] },
  ] },
  { label: "Digital future", eyebrow: "05 / Tools & ideas", questions: [
    { id: "q15", text: "Would you find a digital tool that shows IIT's sustainability information useful?", type: "single", options: ["Definitely not", "Probably not", "Not sure", "Probably yes", "Definitely yes"] },
    { id: "q16", text: "What information or features would you like to see in such a digital tool?", type: "multi", options: ["Electricity use", "Water use", "Recycling and waste information", "Sustainability goals and progress", "Sustainability events and activities", "Tips on how to be more sustainable", "A way to report environmental problems", "A way to suggest new ideas", "Rewards or challenges for sustainable actions", "Information about recycling old electronic equipment", "Other"] },
    { id: "q17", text: "How would you prefer to receive sustainability information from IIT?", type: "single", options: ["Mobile app", "Website/student portal", "Email", "Social media", "Digital screens around campus", "Posters/notices", "Other"] },
    { id: "q18", text: "Would rewards or recognition encourage you to take part in more sustainability activities?", type: "single", options: ["Yes", "No", "Maybe"] },
    { id: "q19", text: "What is one thing IIT could do to become more sustainable?", type: "text" },
    { id: "q20", text: "Do you have any other suggestions for improving sustainability at IIT?", type: "text", optional: true },
  ] },
];

export const questions = sections.flatMap(s => s.questions);
export type Answers = Record<string, string | string[]>;
export function validateAnswers(input: unknown): { ok: true; answers: Answers } | { ok: false; message: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, message: "Invalid response." };
  const source = input as Record<string, unknown>;
  const answers: Answers = {};
  for (const q of questions) {
    const value = source[q.id];
    if (q.type === "text") {
      if (typeof value !== "string" || value.trim().length > 600 || (!q.optional && !value.trim())) return { ok: false, message: `Please complete question ${q.id.slice(1)} (up to 600 characters).` };
      answers[q.id] = value.trim();
    } else if (q.type === "single") {
      if (typeof value !== "string" || !q.options?.includes(value)) return { ok: false, message: `Please answer question ${q.id.slice(1)}.` };
      answers[q.id] = value;
    } else {
      if (!Array.isArray(value) || !value.length || value.length > (q.max || q.options!.length) || new Set(value).size !== value.length || value.some(v => typeof v !== "string" || !q.options?.includes(v)) || (q.id === "q11" && value.includes("None") && value.length > 1)) return { ok: false, message: `Please check your choices for question ${q.id.slice(1)}.` };
      answers[q.id] = value as string[];
    }
    if (q.options?.includes("Other") && (Array.isArray(value) ? value.includes("Other") : value === "Other")) {
      const other = source[`${q.id}_other`];
      if (typeof other !== "string" || !other.trim() || other.trim().length > 120) return { ok: false, message: `Please specify “Other” for question ${q.id.slice(1)} (up to 120 characters).` };
      answers[`${q.id}_other`] = other.trim();
    }
  }
  return { ok: true, answers };
}
