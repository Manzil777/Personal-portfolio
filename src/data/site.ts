export type IndexItem = { title: string; detail: string; summary: string; shape: string; href?: string };
export type Project = IndexItem & { slug: string; year: string; stack: string[]; sections: { heading: string; text: string }[] };

export const site = {
  name: "Manzil Shrestha",
  shortName: "Manzil",
  role: "AI and Data Science student",
  description: "Manzil Shrestha builds machine-learning systems, data products, and useful software from raw signals.",
  location: "Bengaluru, India",
  email: "shresthamanxil@gmail.com",
  url: "http://localhost:3000",
  socials: [
    { label: "GitHub", href: "https://github.com/Manzil777" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/manzil-shrestha-6b0607218/" },
    { label: "X", href: "https://x.com/manzilshrestha9" },
    { label: "Resume", href: "/resume.pdf" },
  ],
};

export const projects: Project[] = [
  {
    slug: "proteinclassify", title: "ProteinClassify", detail: "PyTorch · ESM-2 · React", shape: "protein",
    summary: "A bioinformatics platform that classifies protein sequences across 321 families.", year: "2025", stack: ["Flask", "PyTorch", "ESM-2", "React", "Tailwind CSS"],
    sections: [
      { heading: "Context", text: "ProteinClassify turns a sequence-analysis workflow into a single full-stack platform for classification and interpretation." },
      { heading: "System", text: "It extracts transformer embeddings with Meta's ESM-2 model, uses a custom MLP classifier, and supports batch FASTA uploads." },
      { heading: "Interpretation", text: "PCA-based embedding visualisation and real-time ESMFold structure prediction make model output easier to inspect." },
    ],
  },
  {
    slug: "student-feedback-sentiment-analysis", title: "Student feedback sentiment analysis", detail: "Python · NLP · Scikit-learn", shape: "sentiment",
    summary: "An end-to-end NLP pipeline for turning student feedback into usable sentiment trends.", year: "2025", stack: ["Python", "Scikit-learn", "NLTK", "Pandas", "Matplotlib"],
    sections: [
      { heading: "Context", text: "The project classifies more than 1,000 student-feedback entries as positive, neutral, or negative." },
      { heading: "Method", text: "Tokenisation, stopword removal, lemmatisation, and TF-IDF vectorisation feed a Logistic Regression model evaluated with precision, recall, and F1-score." },
      { heading: "Outcome", text: "The model achieved 88% classification accuracy, while automated SMTP collection and visualisation made trends easier to review." },
    ],
  },
  {
    slug: "soletrack", title: "SoleTrack", detail: "PHP · MySQL · JavaScript", shape: "inventory",
    summary: "A lightweight retail POS and inventory system with SKU-level reporting.", year: "2025", stack: ["PHP", "MySQL/MariaDB", "JavaScript", "HTML", "CSS"],
    sections: [
      { heading: "Context", text: "SoleTrack was designed for a footwear retailer needing clearer stock and sales operations." },
      { heading: "System", text: "The application tracks brand, size, and quantity by SKU with role-based Admin and Cashier access plus password hashing." },
      { heading: "Outcome", text: "Daily sales reports and stock analytics support operational decisions while reducing manual inventory work." },
    ],
  },
];

export const experience: IndexItem[] = [
  { title: "The FOOT's Nepal", detail: "Design and Requirements Analyst", shape: "flow", summary: "Translated retail inventory needs into functional requirements, system architecture, and a database schema." },
  { title: "CMRIT project exhibition", detail: "Top 3 finish", shape: "trophy", summary: "SoleTrack was selected among the Top 3 departmental mini-project exhibition entries." },
  { title: "RARE Club", detail: "Promotion head and social media manager", shape: "signal", summary: "Led promotional and social-media work as part of the CMRIT student club." },
];

export const life: IndexItem[] = [
  { title: "Basketball", detail: "Sport", shape: "ball", summary: "Active basketball player." },
  { title: "Football", detail: "Sport", shape: "ball", summary: "Active football player." },
  { title: "Music", detail: "Listening", shape: "wave", summary: "A place to reset between builds." },
  { title: "New places", detail: "Exploring", shape: "map", summary: "Always looking for the next route out of the familiar." },
];
