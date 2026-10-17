export type Row = {
  title: string;
  detail?: string;
  /** Registry key, e.g. "project:zeal" */
  shape: string;
  /** Shown in the footer tagline while this row is hovered/focused. */
  summary?: string;
  /** External destination; when omitted the row renders as a button. */
  href?: string;
};

export type TabData = {
  label: string;
  rows: Row[];
};

export type Social = {
  label: string;
  href: string;
  /** Registry key for the hover/click preview. */
  shape: string;
};

export const site = {
  name: "Manzil",
  heading: "Manzil",
  role: "AI and Data Science student",
  location: "Bengaluru, India",
  email: "shresthamanxil@gmail.com",
  url: "https://manzil.vercel.app",
  description:
    "Manzil — AI and Data Science student. Builds things where machine learning meets engineering.",
  bio: [
    "I'm an AI & Data Science student who likes turning models into things that actually run. I work where machine learning meets engineering: pipelines, deployment, and the mechanics that keep a model alive after the notebook closes.",
    "Third year at CMRIT. Outside class I write Python and tinker with MLOps tooling and small experiments.",
  ],
  tagline: "Will happily talk transformers, LSTM weather models or the next hackathon with anyone.",
  hint: "Point at anything on the right to see it drawn in dots.",
  themeStorageKey: "manzil-ui-theme",
  restShape: "portrait",
} as const;

export const socials: Social[] = [
  {
    label: "GitHub",
    href: "https://github.com/Manzil777",
    shape: "logo:github",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/manzil-shrestha-6b0607218/",
    shape: "logo:linkedin",
  },
  {
    label: "Résumé",
    href: "/resume.pdf",
    shape: "logo:resume",
  },
];

export const tabs: TabData[] = [
  {
    label: "Projects",
    rows: [
      {
        title: "AI-FORGE",
        detail: "Python · Digital Forensics",
        shape: "project:ai-forge",
        summary: "A multi-modal digital forensic investigation platform.",
        href: "https://github.com/Manzil777?tab=repositories",
      },
      {
        title: "ProteinClassify",
        detail: "PyTorch · ESM-2",
        shape: "project:proteinclassify",
        summary: "Classifies protein sequences across 321 families with ESM-2 embeddings.",
        href: "https://github.com/Manzil777?tab=repositories",
      },
      {
        title: "Feedback sentiment",
        detail: "Python · NLP",
        shape: "project:sentiment",
        summary: "An NLP pipeline that sorts 1,000+ feedback entries at 88% accuracy.",
        href: "https://github.com/Manzil777?tab=repositories",
      },
      {
        title: "SoleTrack",
        detail: "PHP · MySQL",
        shape: "project:soletrack",
        summary: "A retail POS with SKU-level stock tracking and role-based access.",
        href: "https://github.com/Manzil777?tab=repositories",
      },
      {
        title: "Weather (LSTM)",
        detail: "TensorFlow · Time series",
        shape: "project:weather",
        summary: "An LSTM that forecasts weather from historical time-series data.",
        href: "https://github.com/Manzil777?tab=repositories",
      },
      {
        title: "Human Following Robot",
        detail: "Arduino · C/C++",
        shape: "project:robot",
        summary: "An IR and ultrasonic robot that tracks a person and dodges obstacles.",
        href: "https://github.com/Manzil777?tab=repositories",
      },
    ],
  },
  {
    label: "Education",
    rows: [
      {
        title: "CMRIT",
        detail: "AI & Data Science · 3rd year",
        shape: "edu:cmrit",
        summary: "B.E. in AI & Data Science at CMR Institute of Technology — CGPA 8.47, 2027.",
      },
      {
        title: "St. Xavier",
        detail: "Science · 12th",
        shape: "edu:stxaviers",
        summary: "Higher secondary science in Jawlakhel, Nepal — GPA 3.2/4.0, 2023.",
      },
    ],
  },
  {
    label: "Life",
    rows: [
      { title: "Basketball", detail: "Sport", shape: "life:basketball" },
      { title: "Football", detail: "Sport", shape: "life:football" },
      { title: "Music", detail: "Listening", shape: "life:music" },
      { title: "New places", detail: "Exploring", shape: "life:places" },
      { title: "RARE Club", detail: "Leadership", shape: "life:club" },
      { title: "Apticode", detail: "Hackathon", shape: "life:hackathon" },
    ],
  },
];
