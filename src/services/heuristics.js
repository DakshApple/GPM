import { uid, toISO, addDays, fromISO, daysBetween } from '../utils/date';

export function suggestModules(project) {
  const text = `${project.name} ${project.description || ""}`.toLowerCase();
  const templates = [
    { match: ["shopify","e-commerce","ecommerce","store","cart"], modules: [
      { name:"Product catalog",   days:3,  description:"collections, product pages, media" },
      { name:"Cart & checkout",   days:5,  description:"payment gateway, tax, shipping" },
      { name:"User accounts",     days:7,  description:"signup, login, order history" },
      { name:"Admin & analytics", days:9,  description:"dashboard, inventory, reporting" },
      { name:"Launch",            days:11, description:"QA, dns, go-live" },
    ]},
    { match: ["voice","voice ai","agent"], modules: [
      { name:"Intent design",       days:3,  description:"utterances, slot map, escalation" },
      { name:"Voice model + prompt", days:6, description:"system prompt, tuning, edge cases" },
      { name:"Backend integrations", days:9, description:"crm, calendar, webhooks" },
      { name:"QA + call testing",   days:12, description:"test scripts, latency, fallbacks" },
      { name:"Launch",              days:14, description:"phone number, monitoring" },
    ]},
    { match: ["landing","waitlist","launch"], modules: [
      { name:"Copy & content", days:2, description:"headlines, story, ctas" },
      { name:"Design",         days:4, description:"hero, sections, responsive" },
      { name:"Development",    days:7, description:"build, integrations, forms" },
      { name:"SEO + launch",   days:9, description:"meta, sitemap, go-live" },
    ]},
    { match: ["reel","video","content engine"], modules: [
      { name:"Template design",    days:3,  description:"reel templates, motion presets" },
      { name:"Ingestion pipeline", days:6,  description:"source content, clip, render" },
      { name:"Posting engine",     days:9,  description:"scheduler, ig/tt api, retries" },
      { name:"Analytics loop",     days:12, description:"performance, next batch" },
    ]},
    { match: ["chatbot","chat","assistant"], modules: [
      { name:"Conversation design", days:3,  description:"flows, prompts, fallbacks" },
      { name:"Knowledge base",     days:6,  description:"rag setup, doc ingestion" },
      { name:"Frontend widget",    days:8,  description:"embeddable ui, brand" },
      { name:"Deployment",         days:10, description:"hosting, monitoring" },
    ]},
  ];
  const found = templates.find(t => t.match.some(k => text.includes(k)));
  const chosen = found || { modules: [
    { name:"Discovery + scope", days:2, description:"align on scope, deliverables" },
    { name:"Design",            days:5, description:"wireframes, ui, brand" },
    { name:"Build",             days:Math.max(9, Math.floor(project.estimatedDays*0.7)), description:"core development" },
    { name:"QA + launch",       days:project.estimatedDays, description:"testing, deployment" },
  ]};
  const maxDays = daysBetween(project.startDate, project.deadline);
  return chosen.modules.map((m, i) => ({
    id: uid(), projectId: project.id, name: m.name, description: m.description, order: i+1,
    deadline: toISO(addDays(fromISO(project.startDate), Math.min(m.days, maxDays))),
  }));
}

export function suggestTaskBreakdown(title) {
  const t = title.toLowerCase();
  if (t.includes("auth")||t.includes("login")||t.includes("signup")) return ["design auth forms","wire up auth api","add validation + error states","password reset flow","test edge cases"];
  if (t.includes("landing")||t.includes("hero")) return ["copy draft","layout wireframe","final design","responsive build","seo meta"];
  if (t.includes("checkout")||t.includes("payment")) return ["payment gateway integration","cart summary UI","success/failure states","email receipts"];
  if (t.includes("api")||t.includes("backend")) return ["schema design","endpoints","auth middleware","tests","api docs"];
  if (t.includes("design")||t.includes("ui")) return ["research references","wireframes","high-fi mocks","iteration + handoff"];
  return ["scope + notes","first draft","internal review","final polish"];
}
