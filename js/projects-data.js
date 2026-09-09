/* ============================================================
   projects-data.js — single source of truth for project content

   The one source of truth. Three things read it and none of
   them hold a copy:

     js/timeline.js     the thread on the home page
     js/projects.js     the card rail on projects.html
     js/project-page.js the full page at project.html?p=<slug>

   Add a project here once and a checkpoint, a card and a page
   all appear, with no other change anywhere.

   Media conventions:
     assets/projects/<slug>-cover.jpg      full-size case-study hero
     assets/projects/<slug>-1..3.png       full-size case-study shots
     assets/projects/web/<slug>-poster.jpg light poster for the home viewer
     assets/projects/web/<slug>-1..3.jpg   light slideshow frames (1400px)
     assets/projects/<slug>.mp4            walkthrough video

   Links:
     Every project carries a `links` block, and one button is
     rendered per entry that actually has a URL. An empty string
     is a real, supported state — the button is simply not drawn,
     so a project with nothing to link to yet gets one button
     rather than a dead one.
   ============================================================ */

window.__PROJECT_ORDER = ['audixa', 'fettle', 'bubble'];

window.__PROJECTS = {
  audixa: {
    name: 'Audixa',
    cat: 'AI Expense Platform',
    year: '3 weeks · solo',
    when: '2025',
    role: 'Full Stack Developer',
    stack: 'React · TypeScript · tRPC · Express · Drizzle ORM · MySQL',
    chips: ['React', 'TypeScript', 'tRPC', 'Express', 'Drizzle', 'MySQL'],
    type: 'finance',
    tagline: 'Receipts go in. Decisions come out.',
    overview: [
      'Audixa is an AI-powered expense platform: receipts go in, decisions come out. OCR extracts line items from uploaded receipts, and an automated auditing layer checks every expense against company policy before a human ever sees it.',
      'Built solo in three weeks — the full stack, from the type-safe tRPC API and Drizzle/MySQL data layer to the finance dashboard with approvals, flagged reviews, analytics and real-time alerts.',
    ],
    challenge: 'Expense review is slow because every receipt needs human eyes — even the 90% that are obviously fine. The interesting problem was deciding automatically which expenses actually deserve attention.',
    solution: 'OCR receipt extraction feeds a policy-compliance engine that audits each expense automatically. Compliant items sail through; violations are flagged with reasons into a review queue, with dashboards and real-time alerts keeping approvers on top of what matters.',
    stats: [
      { n: 'Solo', l: 'team of one' },
      { n: '3 wks', l: 'idea to shipped' },
      { n: 'OCR', l: 'receipt extraction' },
    ],
    shots: ['Finance dashboard', 'Flagged review queue', 'Receipt extraction'],
    links: {
      live: 'https://expense-auditor-two.vercel.app/',
      repo: 'https://github.com/sohin-2005/expense-auditor',
    },
    video: {
      local: 'assets/projects/audixa.mp4',
      cdn: 'https://res.cloudinary.com/axwfqbuk/video/upload/v1784921981/audixa_heujcm.mov',
    },
  },

  fettle: {
    name: 'Fettle',
    cat: 'Recovery-aware Workout Planner',
    year: '2 weeks · solo',
    when: '2025',
    role: 'Full Stack Developer',
    stack: 'Next.js · React · TypeScript · Tailwind CSS · Supabase',
    chips: ['Next.js', 'React', 'TypeScript', 'Tailwind', 'Supabase'],
    type: 'travel',
    tagline: 'Training that respects recovery.',
    overview: [
      'Fettle is a workout planning app that takes recovery as seriously as training. An interactive body map visualizes muscle recovery in real time, so you can see at a glance which muscle groups are ready to work and which still need rest.',
      'It generates data-driven weekly training plans around that recovery state, and synchronizes across devices through optional cloud authentication with Supabase.',
    ],
    challenge: 'Most workout apps plan as if you recover instantly — schedule chest on Monday, chest again on Tuesday, and let soreness sort itself out. Training plans need to react to how the body actually recovers.',
    solution: 'A recovery model drives everything: each completed session updates per-muscle recovery curves rendered live on the interactive body map, and the weekly plan generator schedules around them — hitting recovered muscle groups and protecting the ones still rebuilding.',
    stats: [
      { n: '2 wks', l: 'solo build' },
      { n: 'Live', l: 'recovery body map' },
      { n: 'Sync', l: 'across devices' },
    ],
    shots: ['Recovery body map', 'Weekly plan generator', 'Session tracker'],
    links: {
      live: 'https://fettle-three.vercel.app/',
      repo: 'https://github.com/sohin-2005/Fettle',
    },
    video: {
      local: 'assets/projects/fettle.mp4',
      cdn: 'https://res.cloudinary.com/axwfqbuk/video/upload/v1784922102/fettle_rttb7g.mp4',
    },
  },

  bubble: {
    name: 'Financial Bubble Detection',
    short: 'Bubble Detection',
    cat: 'Financial ML System',
    year: '3 months · team of 4',
    when: '2025',
    role: 'UI/UX Developer',
    stack: 'Python · Scikit-learn · FinBERT · FastAPI · PostgreSQL · Streamlit',
    chips: ['Python', 'Scikit-learn', 'FinBERT', 'FastAPI', 'PostgreSQL', 'Streamlit'],
    type: 'chart',
    tagline: 'Reading the market before it breaks.',
    overview: [
      'End-to-end ML pipeline and live monitoring dashboard for detecting bubble and crash risk in the Nifty 50 index. It combines lagged price-based features — rolling Z-scores, momentum, volatility ratios, skewness and kurtosis — with FinBERT news sentiment and macro context.',
      'The deployed dashboard turns the model into an at-a-glance risk read, surfacing real-time RSI, MACD, a composite sentiment index, and macro indicators like GDP growth, CPI inflation and the repo rate alongside the classifier output.',
    ],
    challenge: 'Traditional bubble detectors often rely on statistical anomalies that do not always line up with real crashes, and time-series models are easy to break with look-ahead bias if rolling windows or train/test splits are handled incorrectly.',
    solution: 'Temporal leakage was fixed by shifting all market and sentiment features by one day before rolling windows were computed, replacing shuffled splits with a strict date-based split, and redefining labels around the 60 days preceding a real 30%+ drawdown. Class weighting handled the rare-event imbalance, and the held-out temporal evaluation produced XGBoost F1 0.918 and Random Forest F1 0.883.',
    stats: [
      { n: '0.918', l: 'XGBoost F1' },
      { n: '0.883', l: 'Random Forest F1' },
      { n: 'SAFE', l: 'current market read' },
    ],
    shots: ['Probability dashboard', 'Sentiment signals', 'Model performance'],
    links: {
      // no live deployment yet: the rail and the project page
      // both drop the button rather than linking nowhere
      live: '',
      repo: 'https://github.com/sohin-2005/financial-bubble-detection-system',
    },
    video: {
      local: 'assets/projects/bubble.mp4',
      cdn: 'https://res.cloudinary.com/axwfqbuk/video/upload/v1784921980/bubble_mnllcx.mov',
    },
  },
};
