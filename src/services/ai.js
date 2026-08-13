import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function generateDayOverview(date, context) {
  if (!ai) {
    throw new Error("Missing VITE_GEMINI_API_KEY in your .env file.");
  }

  const { projects, tasks, employees } = context;

  const prompt = `
You are a highly capable Project Management AI.
Your job is to provide a brief, actionable, and beautiful summary of a single working day based on the provided data.

Date: ${date}

DATA:
Active Projects:
${projects.map(p => `- ${p.name} (Client: ${p.client})`).join('\n') || "None"}

Tasks Due/Completed on this Date:
${tasks.map(t => `- [${t.status.toUpperCase()}] ${t.title} (Assigned to: ${employees.find(e => e.id === t.assigneeId)?.name || "Unassigned"}, Project: ${projects.find(p => p.id === t.projectId)?.name || "Unknown"})`).join('\n') || "None"}

Please analyze the above data and provide a response in Markdown formatted with the following sections:
### 👥 Team Workload
(Who is very busy today? Who has light work today? Name the team members and what they are working on.)

### 🚀 Project Impact
(Which projects are getting touched today? What major progress is being made?)

### 🕒 Estimated Output
(Estimate the total working hours required today. Assume a standard task takes 2-4 hours depending on complexity. Provide a quick summary of the day's intensity.)

Keep your tone professional, concise, and highly actionable.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI Generation failed:", error);
    throw new Error("Failed to generate AI overview: " + error.message);
  }
}
