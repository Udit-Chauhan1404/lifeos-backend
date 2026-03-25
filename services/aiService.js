const OpenAI  = require("openai");
const logger  = require("../utils/logger");
const prisma  = require("../config/prisma");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM = `You are LifeOS AI, a productivity coach embedded in the LifeOS app.
Help users with tasks, habits, goals, and daily planning.
Be concise, motivational, and actionable. Format responses in plain text with emoji.
If asked about topics unrelated to productivity, politely redirect.`;

const callAI = async (userId, endpoint, messages, maxTokens = 800) => {
  const start = Date.now();
  let response = "", tokens = 0, success = true;
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM }, ...messages],
      max_tokens: maxTokens, temperature: 0.7,
    });
    response = completion.choices[0].message.content;
    tokens   = completion.usage?.total_tokens || 0;
    return response;
  } catch (e) {
    success = false;
    logger.error("OpenAI error:", e.message);
    // Return a helpful fallback instead of crashing
    return "I'm having trouble connecting to my AI brain right now. Please try again in a moment! 🔄";
  } finally {
    prisma.aIUsage.create({ data: { userId, endpoint, prompt: messages.at(-1)?.content?.slice(0, 5000) || "", response: response.slice(0, 10000), tokensUsed: tokens, durationMs: Date.now() - start, success } }).catch(() => {});
  }
};

exports.getAdvice = (userId, tasks, habits, goals) => {
  const taskSummary  = tasks.slice(0, 10).map(t => `- [${t.status}] ${t.title} (${t.priority})`).join("\n");
  const habitSummary = habits.slice(0, 8).map(h => `- ${h.name}: streak ${h.currentStreak}d`).join("\n");
  const goalSummary  = goals.slice(0, 6).map(g => `- ${g.title}: ${g.progress}%`).join("\n");
  return callAI(userId, "advice", [{ role: "user", content: `My current state:\n\nTASKS:\n${taskSummary || "None"}\n\nHABITS:\n${habitSummary || "None"}\n\nGOALS:\n${goalSummary || "None"}\n\nGive me focused productivity advice for today.` }]);
};

exports.getDailyPlan = (userId, tasks, habits, events) => {
  const open = tasks.filter(t => t.status !== "done").slice(0, 10);
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  return callAI(userId, "daily-plan", [{ role: "user", content: `Today is ${today}.\n\nOpen tasks:\n${open.map(t => `- ${t.title} [${t.priority}]`).join("\n") || "None"}\n\nHabits to complete:\n${habits.filter(h => !h.done).map(h => `- ${h.name}`).join("\n") || "All done!"}\n\nEvents:\n${events.map(e => `- ${e.title} at ${e.time}`).join("\n") || "None"}\n\nCreate a detailed hour-by-hour schedule for today.` }]);
};

exports.prioritizeTasks = (userId, tasks) =>
  callAI(userId, "prioritize", [{ role: "user", content: `Prioritize these tasks by impact and urgency. Return ONLY a JSON array with fields: id, title, aiPriority (1-10), reasoning.\n\n${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, priority: t.priority, due: t.due, status: t.status })))}` }], 600);

exports.getWeeklyReport = (userId, tasks, habits, goals) => {
  const done = tasks.filter(t => t.status === "done").length;
  const pct  = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return callAI(userId, "weekly-report", [{ role: "user", content: `Generate my weekly productivity report.\n\nCompleted ${done}/${tasks.length} tasks (${pct}%).\nHabits:\n${habits.map(h => `- ${h.name}: streak ${h.currentStreak}d`).join("\n")}\nGoals:\n${goals.map(g => `- ${g.title}: ${g.progress}%`).join("\n")}\n\nInclude: wins, improvements, next week focus, motivational close.` }]);
};

exports.chat = (userId, userMessage, history = []) =>
  callAI(userId, "chat", [
    ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ], 500);
