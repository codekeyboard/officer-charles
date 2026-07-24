export const navItems = [
  { label: "FAQs", href: "#faqs" },
  { label: "Pricing", href: "#pricing" },
  { label: "Blog", href: "/blog" },
];

export const images = {
  training: "/chat-training.png",
  simulation: "/real-visa-simulation.png",
  video: "/video-training.png",
  avatar: "/avatar.png",
  dashboard: "/dashboard-card.png",
  interview: "/interview-card.png",
  evaluation: "/evaluation.png",
};

export const overviewItems = [
  {
    icon: "message",
    title: "Real interview flow",
    text: "Officer Charles asks one focused question at a time and keeps the conversation on your visa type.",
    metric: "F1",
    metricLabel: "B1/B2",
  },
  {
    icon: "brain",
    title: "Answer intelligence",
    text: "Every response is evaluated for relevance, clarity, intent, ties, funding, and communication.",
    metric: "6",
    metricLabel: "signals",
  },
  {
    icon: "file",
    title: "Saved progress",
    text: "Your transcripts, scores, feedback, and recommendations remain available in history.",
    metric: "1",
    metricLabel: "dashboard",
  },
];

export const faqItems = [
  {
    question: "What does Try free include?",
    answer:
      "New users receive 20 free credits after signup. That covers 4 chat training sessions or 2 real visa simulations.",
  },
  {
    question: "Which interview types work today?",
    answer:
      "Chat Training and Chat Real Visa Simulation are available now. Video and live interview flows are marked Coming Soon.",
  },
  {
    question: "Which visas are supported?",
    answer:
      "Officer Charles currently supports F1 student visa practice and B1/B2 visitor visa practice.",
  },
  {
    question: "Does this guarantee visa approval?",
    answer:
      "No. Officer Charles is a preparation tool and is not affiliated with any government agency.",
  },
];

export const testimonials = [
  {
    name: "James Wilson",
    title: "F1 applicant",
    quote:
      "Training mode helped me fix short answers before I moved into the stricter simulation.",
  },
  {
    name: "Emily Carter",
    title: "B1/B2 applicant",
    quote:
      "I finally understood which answers sounded weak and how to explain my travel purpose clearly.",
  },
  {
    name: "Michael Brooks",
    title: "Student visa prep",
    quote: "The final report made my preparation feel organized instead of random.",
  },
];

export const creditUses = [
  {
    title: "Chat Training",
    credits: "5 credits",
    text: "Practice mode with hints and coaching.",
  },
  {
    title: "Real Simulation",
    credits: "10 credits",
    text: "Exam-style mode with detailed feedback afterward.",
  },
  {
    title: "Video Training",
    credits: "15 credits",
    text: "Coming Soon for live interview practice.",
  },
];

export const pricingPlans = [
  {
    id: "starter",
    name: "Starter",
    price: "9.00",
    creditAmount: 50,
    features: [
      "50 credits",
      "Works with F1 and B1/B2 chat practice",
      "Saved history and evaluations",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "19.00",
    creditAmount: 120,
    features: [
      "120 credits",
      "Works with F1 and B1/B2 chat practice",
      "Saved history and evaluations",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "39.00",
    creditAmount: 300,
    features: [
      "300 credits",
      "Works with F1 and B1/B2 chat practice",
      "Saved history and evaluations",
    ],
  },
];

export const getStartedSteps = [
  ["Sign up", "Create your account and receive 20 free credits."],
  ["Choose visa", "Pick F1 or B1/B2 and select training or simulation."],
  ["Answer", "Respond to realistic Officer Charles questions."],
  ["Review", "Read scores, feedback, recommendations, and history."],
];

export type BlogPost = {
  slug: string;
  title: string;
  category: string;
  date: string;
  readTime: string;
  excerpt: string;
  body: string[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "f1-visa-interview-answer-structure",
    title: "How to structure a strong F1 visa interview answer",
    category: "F1 Visa",
    date: "Interview Prep",
    readTime: "5 min read",
    excerpt:
      "A simple framework for explaining university choice, funding, career plan, and intent to return without sounding memorized.",
    body: [
      "A strong F1 answer usually has four parts: the exact reason for your university choice, why the program fits your academic background, how your funding is arranged, and what you plan to do after graduation.",
      "Start with your university choice. The officer is not looking for a brochure-style answer. They want to know why this specific school makes sense for your background and goals. Mention the program, department strength, course area, research focus, location advantage, or career connection that honestly applies to you.",
      "Next, connect the program to your academic history. If you studied computer science, business, engineering, health sciences, or another field, explain how the new program continues or strengthens that path. This makes the answer sound planned instead of random.",
      "Funding should be clear and realistic. State who is sponsoring you, what they do, and why the funds are available. Do not over-explain unless the officer asks. A short, confident answer is usually stronger than a long answer with too many extra details.",
      "Finally, mention your future plan. Your answer should show that studying in the United States fits into a larger plan, not that the visa itself is the goal. Explain how the degree helps your career after graduation and keep the answer consistent with your documents.",
      "A useful structure is: I chose this university because... The program fits me because... My studies are funded by... After graduation I plan to... Keep it natural, short, and specific to your real situation.",
    ],
  },
  {
    slug: "b1-b2-travel-purpose-credible-answers",
    title: "B1/B2 travel purpose answers that sound credible",
    category: "B1/B2 Visa",
    date: "Practice Guide",
    readTime: "4 min read",
    excerpt:
      "Learn how to explain travel plans, length of stay, finances, accommodation, and home-country ties clearly.",
    body: [
      "For a B1/B2 interview, your travel purpose should be simple and believable. Say what you are going to do, where you will stay, how long you will remain, and who is paying for the trip.",
      "Strong answers include dates, cities, and a realistic plan. For example, I plan to visit New York and Washington, D.C. for tourism for two weeks in October is stronger than I want to see America. Specific plans make your purpose easier to understand.",
      "Your financial answer should match your trip. If you are paying yourself, mention your job or business and that you have savings for the trip. If someone else is helping, explain who they are and why they are supporting the visit.",
      "You should also be ready to explain why you will return home. Employment, business responsibilities, family obligations, studies, property, or other commitments can support this if they are true. Do not invent ties; focus on the strongest real reasons.",
      "A clear answer might follow this pattern: I am visiting for tourism/business/family. I plan to stay for X days in Y city. I will stay at Z. I will pay through... I need to return because...",
    ],
  },
  {
    slug: "training-mode-vs-real-simulation",
    title: "Training mode vs real simulation: when to use each",
    category: "Officer Charles",
    date: "Product Guide",
    readTime: "3 min read",
    excerpt:
      "Use training mode to improve weak answers, then switch to real simulation when you want a stricter interview flow.",
    body: [
      "Training mode is best when you are still improving. It gives feedback after each answer, points out missing details, and lets you retry weak or unclear responses.",
      "Use training mode for topics that usually create stress: funding, university choice, travel purpose, sponsor details, home-country ties, career plan, or why you chose the United States. The goal is to build answers that are clear without sounding memorized.",
      "Real simulation mode is stricter. It behaves more like a visa officer: short questions, fewer hints, no visible score during the interview, and a final evaluation after completion.",
      "A good practice routine is to begin with training mode for difficult topics. Once your answers become consistent, run a real simulation to test whether you can answer under pressure.",
      "This gives you both coaching and pressure. Training builds the answer; simulation tests whether the answer holds up in a realistic interview flow.",
    ],
  },
  {
    slug: "what-visa-officers-listen-for",
    title: "What visa officers listen for in your answers",
    category: "Interview Strategy",
    date: "Answer Quality",
    readTime: "4 min read",
    excerpt:
      "Understand the signals behind strong answers: purpose, consistency, financial clarity, and intent to return.",
    body: [
      "Visa officers usually have limited time, so they listen for signals. They want to understand your purpose, whether your plans are realistic, whether your funding makes sense, and whether your answers match your documents.",
      "A strong answer is not always long. In many cases, a short answer with specific facts is more effective than a long answer that repeats generic phrases. The officer should be able to quickly understand what you mean.",
      "Consistency matters. If your university, sponsor, job, travel plan, or family details change from one answer to another, the interview becomes weaker. Practice helps you keep the same facts clear under pressure.",
      "For students, the strongest signals are academic fit, funding, career plan, and home-country ties. For visitors, the strongest signals are travel purpose, length of stay, finances, and a clear reason to return.",
      "Officer Charles is designed to train these signals directly. It asks realistic follow-up questions and helps you notice when an answer is vague, risky, or missing an important fact.",
    ],
  },
  {
    slug: "financial-sponsor-answer-guide",
    title: "How to explain your financial sponsor clearly",
    category: "F1 Visa",
    date: "Funding Guide",
    readTime: "5 min read",
    excerpt:
      "A practical way to describe who is paying, what they do, and why the funding is credible.",
    body: [
      "Financial sponsorship is one of the most important F1 interview topics. Your answer should clearly explain who is paying for your studies, what their relationship is to you, what they do, and why the funds are available.",
      "Start with the sponsor relationship. For example, My father is sponsoring my studies or My parents are sponsoring me together. Then add the sponsor's occupation or business in one simple sentence.",
      "Next, explain the source of funds. This might include salary, business income, savings, fixed deposits, education savings, or other documented funds. Keep the explanation aligned with the paperwork you carry.",
      "Avoid sounding uncertain. If the officer asks how much the first year will cost, you should know the approximate tuition and living expense amount. You do not need to recite every document, but you should understand your own funding.",
      "A strong answer might be: My parents are sponsoring my studies. My father runs a textile business and my mother is a school administrator. They have savings set aside for my education, and the first year cost is already covered.",
    ],
  },
  {
    slug: "avoid-memorized-visa-answers",
    title: "How to avoid sounding memorized in a visa interview",
    category: "Practice Guide",
    date: "Speaking Skills",
    readTime: "4 min read",
    excerpt:
      "Practice structure without becoming robotic, and learn how to keep your answers natural under pressure.",
    body: [
      "Many applicants practice by memorizing full paragraphs. That can feel safe, but it often makes answers sound robotic. A better method is to memorize the structure, not the exact sentence.",
      "For each common question, remember three or four key points. For example, for university choice, remember program fit, academic connection, one specific feature, and career link. Then speak naturally around those points.",
      "Use your own vocabulary. If a phrase sounds like something you would never say in normal conversation, replace it. Visa interviews are formal, but they still need to sound like you understand your own plan.",
      "Practice follow-up questions too. Memorized answers often break when the officer asks Why? or How? Officer Charles helps by asking realistic follow-ups instead of only repeating standard questions.",
      "The goal is confident clarity. You should know your facts, documents, plans, and reasons well enough to answer in different ways without changing the meaning.",
    ],
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}
