/**
 * The AI Prompt Playbook, as data.
 *
 * These hundred records were markdown until now: five `##` categories, a `###`
 * per prompt, and 37KB of source that rendered as one uninterrupted wall. They
 * were never really prose: every entry has the identical shape, which is the
 * definition of a table pretending to be a document.
 *
 * As data they can be searched, filtered by category and audience, and copied
 * one at a time. The page also stops generating 107 rail entries, which turned
 * the table of contents into a second wall beside the first.
 *
 * Extracted mechanically from the MDX, not retyped: 100 records, 20 per
 * category, 49 both / 30 professionals / 21 students, the same counts the
 * source file greps to. `prompts.test.ts` holds that shape in place.
 *
 * Adding a prompt now means appending to this array rather than writing
 * markdown. That is the cost of the trade, and it is the right one for content
 * this uniform.
 */

/** Who a prompt is written for. `both` is the default and the largest group. */
export type Audience = 'both' | 'professionals' | 'students';

export type Prompt = {
  /** `"1.1"`: category number, then position within it. Stable; used as the id. */
  id: string;
  categoryId: number;
  category: string;
  title: string;
  audience: Audience;
  /** The prompt itself, verbatim. This is the thing people came to copy. */
  prompt: string;
  /** The one line explaining why it works. Kept, because it is what makes this a
      playbook rather than a list. */
  why: string;
};

export const AUDIENCE_LABEL: Record<Audience, string> = {
  both: 'BOTH',
  professionals: 'PROFESSIONALS',
  students: 'STUDENTS',
};

/**
 * The five categories, with the framing paragraph each one opened with.
 *
 * `anchor` is the id `rehype-slug` gave these when they were markdown headings.
 * The page's own intro links to all five, and so may anything else that ever
 * linked into this page; the component renders them onto its headings so those
 * links keep resolving after the markdown went away.
 */
export const CATEGORIES: { id: number; name: string; anchor: string; intro: string }[] = [
  { id: 1, name: 'Engineering & Coding', anchor: '1-engineering--coding', intro: 'Treat the model like a senior collaborator you\'re handing context to, not an autocomplete engine. The quality gap between "fix this" and a well-scoped prompt is enormous, and it\'s almost entirely about how much real context you hand over up front.' },
  { id: 2, name: 'Learning Anything', anchor: '2-learning-anything', intro: 'Most people use AI as an answer-dispenser when learning, which feels productive but builds nothing. Used as a tutor, one that quizzes, questions, and pushes back, it builds understanding you can actually retrieve later, under pressure, without the tool in front of you.' },
  { id: 3, name: 'Design (Product, UI/UX & Visual)', anchor: '3-design-product-uiux--visual', intro: 'Good critique locates a specific problem; good creative direction imposes a specific constraint. Vague prompts get vague design feedback ("looks clean!") and vague creative options. Specific prompts get you something you can actually act on.' },
  { id: 4, name: 'Content & Growth', anchor: '4-content--growth', intro: 'Content and outreach fail for the same reason: genericness. A hook that could apply to any topic stops no one; an outreach message that could go to anyone gets deleted by everyone. Specificity is the entire game in both.' },
  { id: 5, name: 'AI Image, Video & Animation Generation', anchor: '5-ai-image-video--animation-generation', intro: 'Generators respond to concrete, describable detail (subject, action, environment, style, lighting, camera, mood) not adjectives like "cinematic" or "beautiful" on their own. The less you leave to the model\'s default interpretation, the closer the output lands to what you actually wanted. These prompts are written to work across tools rather than one specific app.' },
];

export const PROMPTS: Prompt[] = [
  {
    id: '1.1',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Turn a rough idea into a spec',
    audience: 'both',
    prompt:
      'I want to build [idea]. Ask me the 5 most important clarifying questions before proposing any solution: things like scope, edge cases, and what \'done\' looks like.',
    why: 'forces requirements-gathering before code, which is the step almost everyone skips.',
  },
  {
    id: '1.2',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Pre-mortem a build',
    audience: 'professionals',
    prompt:
      'I\'m about to build [feature]. Play devil\'s advocate: what are the 3 most likely ways this breaks in production, and what assumption am I making that\'s probably wrong?',
    why: 'surfaces risk while it\'s still cheap to fix.',
  },
  {
    id: '1.3',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Senior-level code review',
    audience: 'both',
    prompt:
      'Review this code like a senior engineer doing a PR review, not a linter. Flag anything that\'ll bite me in 6 months: bad naming, hidden coupling, missing error handling. Be blunt. [paste code]',
    why: 'pushes past syntax-checking into actual judgment.',
  },
  {
    id: '1.4',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Debug without over-explaining',
    audience: 'both',
    prompt:
      'Here\'s an error and the relevant code. Before suggesting a fix, tell me what you think is actually happening, and ask if there\'s context you\'re missing. Error: [x] Code: [y]',
    why: 'stops guessed fixes built on incomplete information.',
  },
  {
    id: '1.5',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Explain your own decision back to you',
    audience: 'professionals',
    prompt:
      'I just made this architecture decision: [decision]. Explain it back to me like you\'re teaching someone else. If my reasoning has a gap, point it out instead of agreeing.',
    why: 'catches rationalizations disguised as reasoning.',
  },
  {
    id: '1.6',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Surface edge cases you missed',
    audience: 'both',
    prompt:
      'List every edge case this function needs to handle that I probably haven\'t thought of. Rank them by how likely I am to have missed them. [paste code]',
    why: 'a prioritized list beats an exhaustive, unranked one.',
  },
  {
    id: '1.7',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Refactor without breaking behavior',
    audience: 'both',
    prompt:
      'Refactor this for readability only: no behavior changes, no new features. List exactly what changed and why so I can verify nothing broke. [paste code]',
    why: 'keeps refactors auditable instead of a leap of faith.',
  },
  {
    id: '1.8',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Write the tests a rushed engineer skips',
    audience: 'professionals',
    prompt:
      'Write test cases for this function, prioritizing boundary values, null inputs, and one adversarial case. Skip the obvious happy path; I\'ve got that. [paste code]',
    why: 'targets the gaps, not the tests you\'d write anyway.',
  },
  {
    id: '1.9',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Compress a long thread into decisions',
    audience: 'professionals',
    prompt:
      'Read this and extract only the decisions made, who owns what, and open questions. Skip the discussion. [paste doc/thread]',
    why: 'turns meeting sprawl into an action log in seconds.',
  },
  {
    id: '1.10',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Sanity-check a plan before committing',
    audience: 'both',
    prompt:
      'Here\'s my plan for [project]: [plan]. Where\'s the weakest assumption? If this fails, what\'s the most likely reason?',
    why: 'one targeted weak point beats generic encouragement or generic criticism.',
  },
  {
    id: '1.11',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Turn a vague bug report into a repro',
    audience: 'professionals',
    prompt:
      'Here\'s a vague bug report: [report]. Write minimal repro steps, and list what info I\'d need to ask the user for if this isn\'t enough.',
    why: 'converts a complaint into an actionable ticket.',
  },
  {
    id: '1.12',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Explain code like a PR description',
    audience: 'both',
    prompt:
      'Explain what this code does like you\'re writing the PR description for someone who\'s never seen it: what changed, why, what to watch for in review. [paste code]',
    why: 'forces plain-language clarity before you ship, not after someone asks.',
  },
  {
    id: '1.13',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'First-project architecture check',
    audience: 'students',
    prompt:
      'I\'m building my first [type of project] for a class/portfolio. Here\'s my planned structure: [structure]. What would a professional flag as over- engineered, and what am I under- engineering?',
    why: 'calibrates a student\'s instinct for scope, which usually skews in one direction or the other.',
  },
  {
    id: '1.14',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Learn a new language fast by translating',
    audience: 'students',
    prompt:
      'I know [language A] well. Translate this snippet into [language B] line by line, explaining the idiomatic difference at each step, not just the syntax swap. [paste code]',
    why: 'builds real fluency instead of copy-paste familiarity.',
  },
  {
    id: '1.15',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Simulate a technical interview',
    audience: 'students',
    prompt:
      'Run me through a technical interview for a [role] position. Ask one question at a time, wait for my answer, then critique it like a real interviewer would before moving to the next.',
    why: 'practice under realistic pressure beats reading interview guides.',
  },
  {
    id: '1.16',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Diagnose a slow query or function',
    audience: 'professionals',
    prompt:
      'Here\'s a slow [query/function] and its execution context. Identify the most likely bottleneck before suggesting an optimization, and tell me how you\'d confirm it. [paste code + context]',
    why: 'diagnosis before treatment, the same discipline as debugging.',
  },
  {
    id: '1.17',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Design an API before building it',
    audience: 'professionals',
    prompt:
      'I need an API for [use case]. Propose the endpoints, request/response shapes, and error cases, then tell me the one design decision most likely to need reworking later.',
    why: 'front-loads the decisions that are expensive to change after the fact.',
  },
  {
    id: '1.18',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Explain an error like I\'m five commits behind',
    audience: 'students',
    prompt:
      'Explain this error message as if I just started learning [language/framework]: what it means, why it\'s happening in my code specifically, and the underlying concept I\'m missing. [paste error + code]',
    why: 'teaches the underlying concept, not just the one-line fix.',
  },
  {
    id: '1.19',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Compare two technical approaches',
    audience: 'both',
    prompt:
      'I\'m choosing between [approach A] and [approach B] for [problem]. Give me a real trade-off table, not a listicle, and tell me which you\'d pick for a team of [size] shipping in [timeframe].',
    why: 'a contextualized recommendation beats a generic pros/cons list.',
  },
  {
    id: '1.20',
    categoryId: 1,
    category: 'Engineering & Coding',
    title: 'Write a commit message that explains "why"',
    audience: 'professionals',
    prompt:
      'Here\'s my diff: [diff]. Write a commit message that explains why this change was made, not just what changed.',
    why: 'future-you (or your teammate) needs the reasoning, not a restatement of the diff.',
  },
  {
    id: '2.1',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Build a first-principles explanation',
    audience: 'both',
    prompt:
      'Explain [concept] to me from first principles, as if I know nothing about the field it comes from. Use one real-world analogy, then show where the analogy breaks down.',
    why: 'analogies teach faster; knowing where they fail prevents new misconceptions.',
  },
  {
    id: '2.2',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Socratic tutor mode',
    audience: 'students',
    prompt:
      'Teach me [topic] using the Socratic method: ask me questions that lead me to the answer instead of explaining it outright. Only give me the answer if I get stuck twice in a row.',
    why: 'active recall beats passive reading, every time.',
  },
  {
    id: '2.3',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Test understanding, not memory',
    audience: 'students',
    prompt:
      'Quiz me on [topic] with questions that test whether I understand it, not whether I memorized it: application and edge-case questions, not definitions.',
    why: 'surfaces shallow understanding before an exam does it for you.',
  },
  {
    id: '2.4',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Explain it three ways',
    audience: 'both',
    prompt:
      'Explain [concept] three different ways: to a total beginner, to someone with related background knowledge, and to an expert looking for nuance. Show me all three.',
    why: 'reveals which level you\'re actually operating at right now.',
  },
  {
    id: '2.5',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Build a learning roadmap with checkpoints',
    audience: 'both',
    prompt:
      'I want to learn [skill] in [timeframe] starting from [current level]. Build me a week-by-week roadmap with a concrete checkpoint project at the end of each week.',
    why: 'structure beats an open-ended pile of course links.',
  },
  {
    id: '2.6',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Find the gap in my mental model',
    audience: 'students',
    prompt:
      'Here\'s how I currently understand [concept]: [your explanation]. Find the gap or misconception in my understanding before correcting it.',
    why: 'targeted correction instead of a full re-teach you don\'t need.',
  },
  {
    id: '2.7',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Turn a chapter into flashcards',
    audience: 'students',
    prompt:
      'Read this and generate 15 flashcards, question on one side and answer on the other, prioritizing the ideas most likely to be tested, not the most memorable trivia. [paste text]',
    why: 'optimizes for exams, not novelty.',
  },
  {
    id: '2.8',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Explain why the "obvious" answer is wrong',
    audience: 'both',
    prompt:
      'For [topic], what\'s the answer most beginners confidently get wrong, and why does it feel right even though it isn\'t?',
    why: 'targets the single highest-value misconception directly.',
  },
  {
    id: '2.9',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Debate both sides to understand a topic',
    audience: 'both',
    prompt:
      'Argue the strongest case for [position] on [topic], then argue the strongest case against it. Don\'t tell me which is right; let me decide after seeing both.',
    why: 'understanding a real debate teaches more than being handed a conclusion.',
  },
  {
    id: '2.10',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Learn from a mistake, not just the correction',
    audience: 'students',
    prompt:
      'Here\'s a problem I got wrong and my incorrect answer: [problem + your answer]. Don\'t just give me the right answer; explain the specific reasoning error that led to mine.',
    why: 'fixes the thought process, not just this one instance.',
  },
  {
    id: '2.11',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Compress a dense paper into what matters',
    audience: 'professionals',
    prompt:
      'Summarize this paper/article into: the core claim, the evidence for it, and the biggest limitation the authors admit or gloss over. [paste text]',
    why: 'teaches critical reading, not just summarizing.',
  },
  {
    id: '2.12',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Build intuition before the formalism',
    audience: 'students',
    prompt:
      'Before showing me the formal definition or formula for [concept], build my intuition for why it exists and what problem it solves.',
    why: 'formulas stick far better once you know why they exist.',
  },
  {
    id: '2.13',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Practice explaining it back',
    audience: 'both',
    prompt:
      'I\'m going to explain [concept] back to you in my own words. Listen, then tell me specifically what I got right, what I got wrong, and what I left out. Here\'s my explanation: [your explanation]',
    why: 'the Feynman technique, on demand, with an actual critic.',
  },
  {
    id: '2.14',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Design a spaced-repetition schedule',
    audience: 'students',
    prompt:
      'I need to retain [topic] long-term, not just for a test. Design a spaced- repetition review schedule and tell me what to actively test myself on at each interval.',
    why: 'retention beats cramming, and most people never plan for it.',
  },
  {
    id: '2.15',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Turn a skill gap into a project',
    audience: 'both',
    prompt:
      'I want to get better at [skill] through building something real, not tutorials. Suggest 3 project ideas at increasing difficulty that would each force me to learn a specific missing piece.',
    why: 'project-based learning beats tutorial hell, reliably.',
  },
  {
    id: '2.16',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Explain how experts actually think about this',
    audience: 'professionals',
    prompt:
      'How does someone with 10+ years of experience in [field] actually think about [problem], as opposed to how it\'s taught to beginners?',
    why: 'closes the real gap between textbook framing and practice.',
  },
  {
    id: '2.17',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Stress-test my understanding with a hard question',
    audience: 'both',
    prompt:
      'Ask me the single hardest, most clarifying question you could ask about [topic] to reveal whether I actually understand it or just recognize the vocabulary.',
    why: 'one sharp question beats ten easy ones.',
  },
  {
    id: '2.18',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Explain a mistake in my own work',
    audience: 'students',
    prompt:
      'Here\'s my [assignment/solution]: [paste it]. Don\'t grade it; just tell me where my reasoning breaks down, in the order I\'d have discovered the problems myself while working through it.',
    why: 'mirrors real discovery and builds your own debugging instinct.',
  },
  {
    id: '2.19',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Connect a new topic to what I already know',
    audience: 'both',
    prompt:
      'I already understand [topic A] well. Explain [new topic B] by mapping it onto what I already know about A: where the mapping holds, and where it misleads.',
    why: 'learning by analogy to your own existing knowledge, not a stranger\'s.',
  },
  {
    id: '2.20',
    categoryId: 2,
    category: 'Learning Anything',
    title: 'Prep for an oral exam or viva',
    audience: 'students',
    prompt:
      'I have an oral exam/viva on [topic]. Play the examiner: ask me increasingly specific follow- up questions on my answers the way a real examiner would to probe for real understanding.',
    why: 'simulates the actual pressure format, not just the content.',
  },
  {
    id: '3.1',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Critique like a senior designer',
    audience: 'both',
    prompt:
      'Critique this design like a senior designer in a design review, not a fan. Focus on hierarchy, clarity, and one thing you\'d cut entirely. [describe/attach design]',
    why: 'cuts the flattery, keeps the useful part.',
  },
  {
    id: '3.2',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Find the confusing moment',
    audience: 'professionals',
    prompt:
      'Walk through this flow as a first-time user would. Tell me the exact point where you\'d hesitate or feel confused, and why. [describe flow]',
    why: 'locates real friction instead of collecting general opinions.',
  },
  {
    id: '3.3',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Justify a design decision under scrutiny',
    audience: 'both',
    prompt:
      'I chose [design decision] for [reason]. Poke holes in that reasoning like a skeptical stakeholder would in a review.',
    why: 'pressure-tests decisions before a real critique does it for you.',
  },
  {
    id: '3.4',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Generate constraints, not options',
    audience: 'both',
    prompt:
      'I\'m designing [thing] for [audience/context]. Instead of giving me options, give me the 3 hardest constraints I should be designing against.',
    why: 'constraints produce sharper work than open-ended brainstorms.',
  },
  {
    id: '3.5',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Name the emotional tone before the visuals',
    audience: 'both',
    prompt:
      'Before I choose any colors or fonts for [project], help me name the emotional tone it should evoke in one sentence, then tell me what visual choices would contradict that tone.',
    why: 'prevents style-first, purpose-later design.',
  },
  {
    id: '3.6',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Compare two directions honestly',
    audience: 'professionals',
    prompt:
      'Here are two design directions for [thing]: [A] and [B]. Don\'t average them; tell me which one better serves [specific goal] and why the other one fails at it.',
    why: 'forces a real decision instead of a watered-down compromise.',
  },
  {
    id: '3.7',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Explain accessibility gaps in plain terms',
    audience: 'both',
    prompt:
      'Review this design for accessibility issues (color contrast, touch target size, screen-reader logic) and explain each issue in terms of a specific user who\'d be blocked by it. [describe/ attach design]',
    why: 'makes abstract accessibility rules concrete and hard to dismiss.',
  },
  {
    id: '3.8',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Simplify without losing meaning',
    audience: 'both',
    prompt:
      'Here\'s a screen/document with too much on it: [describe]. Tell me what to cut, what to combine, and what has to stay non-negotiably.',
    why: 'ruthless prioritization beats surface-level tidying.',
  },
  {
    id: '3.9',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Design system consistency check',
    audience: 'professionals',
    prompt:
      'Compare these two components/screens against our existing design patterns: [describe/paste]. Flag any inconsistency in spacing, naming, or interaction that a user would subconsciously notice even if they couldn\'t name it.',
    why: 'systemic thinking catches what one-off polish misses.',
  },
  {
    id: '3.10',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Build a moodboard brief from a vague ask',
    audience: 'students',
    prompt:
      'A client/professor asked for [vague creative brief]. Turn this into 5 concrete visual directions I could actually mock up, each with a one-line rationale.',
    why: 'converts a vague request into buildable options instead of paralysis.',
  },
  {
    id: '3.11',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Reverse-engineer why something works',
    audience: 'students',
    prompt:
      'Here\'s a design/interface I admire: [describe/link]. Break down the specific decisions that make it work, not just \'it\'s clean,\' but the actual mechanics.',
    why: 'builds design vocabulary through analysis, not imitation.',
  },
  {
    id: '3.12',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Write empty state and error state copy',
    audience: 'both',
    prompt:
      'Write the empty state and error state copy for [feature]. Make it useful, not just apologetic: tell the user what to do next in both cases.',
    why: 'edge states are often the most neglected part of any UX.',
  },
  {
    id: '3.13',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Pressure-test a portfolio piece',
    audience: 'students',
    prompt:
      'Here\'s a project in my portfolio: [describe]. If a hiring manager only had 30 seconds on this piece, what would make them stop scrolling, and what would make them skip it?',
    why: 'optimizes for real reviewer behavior instead of completeness.',
  },
  {
    id: '3.14',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Design for the worst-case user',
    audience: 'both',
    prompt:
      'Design [flow/feature] assuming the user is distracted, on a bad connection, and has never used a product like this before. What breaks first?',
    why: 'stress-tests against real conditions instead of ideal ones.',
  },
  {
    id: '3.15',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Get feedback framed as questions, not verdicts',
    audience: 'both',
    prompt:
      'Review this design, but instead of telling me what\'s wrong, ask me the questions that would make me realize the problems myself. [describe/attach design]',
    why: 'builds your design judgment instead of just fixing this one file.',
  },
  {
    id: '3.16',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Translate a business goal into a design principle',
    audience: 'professionals',
    prompt:
      'The business goal is [goal]. Translate that into one concrete design principle I can actually apply, not a restatement of the goal.',
    why: 'bridges strategy and execution, which usually don\'t talk to each other.',
  },
  {
    id: '3.17',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Audit visual hierarchy in isolation',
    audience: 'both',
    prompt:
      'If I squint at this design so I can only see shapes and contrast, not the actual content, what does my eye go to first, second, third? Does that order match what should matter most? [describe/attach design]',
    why: 'isolates hierarchy from content bias.',
  },
  {
    id: '3.18',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Critique a rebrand or redesign choice',
    audience: 'professionals',
    prompt:
      'We\'re considering changing [brand element] from [old] to [new]. What would a loyal existing user assume this change signals, even if that\'s not our intent?',
    why: 'anticipates the unintended reads before you ship them publicly.',
  },
  {
    id: '3.19',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Build a critique rubric before presenting',
    audience: 'students',
    prompt:
      'I\'m about to present this design in a crit. Give me the 5 questions a tough critic is most likely to ask, so I can prepare answers in advance.',
    why: 'preemptive defense beats reactive scrambling in the room.',
  },
  {
    id: '3.20',
    categoryId: 3,
    category: 'Design (Product, UI/UX & Visual)',
    title: 'Design the first 10 seconds',
    audience: 'both',
    prompt:
      'Design the first 10 seconds of onboarding for [product] assuming the user will abandon it if they don\'t immediately understand the value. What\'s the one thing they need to see or do first?',
    why: 'forces onboarding to earn attention instead of trying to explain everything.',
  },
  {
    id: '4.1',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Turn one idea into a week of content',
    audience: 'both',
    prompt:
      'I have one core idea: [idea]. Break it into 5 distinct pieces of content for [platform], each with a different angle so they don\'t feel repetitive.',
    why: 'one idea, multiple entry points, instead of one post and a blank calendar.',
  },
  {
    id: '4.2',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Write the hook first, everything else second',
    audience: 'both',
    prompt:
      'Write 10 different hooks/opening lines for content about [topic], optimized for someone scrolling past in under a second. Rank them by how likely they are to stop the scroll.',
    why: 'the hook decides whether the rest of the content ever gets seen.',
  },
  {
    id: '4.3',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Find the angle nobody else is using',
    audience: 'professionals',
    prompt:
      'Everyone talks about [topic] the same way: [common angle]. Give me 3 contrarian or unexpected angles on the same topic that are still true.',
    why: 'differentiation without needing to be dishonest.',
  },
  {
    id: '4.4',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Turn a personal experience into a lesson',
    audience: 'both',
    prompt:
      'I went through [experience]. Help me turn this into content that leads with the specific, relatable detail before the lesson, not the lesson first.',
    why: 'specificity builds trust before advice does.',
  },
  {
    id: '4.5',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Write cold outreach that isn\'t generic',
    audience: 'professionals',
    prompt:
      'I want to reach out to [person/role] at [company] about [reason]. Write an opener that references something specific and true about them, not a template compliment.',
    why: 'personalization beats volume, every time it\'s tested.',
  },
  {
    id: '4.6',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Draft a follow-up that doesn\'t sound needy',
    audience: 'professionals',
    prompt:
      'I sent this message [timeframe] ago with no response: [message]. Write a follow-up that adds new value or information instead of just \'checking in.\'',
    why: 'every follow-up should earn a reply, not just request one.',
  },
  {
    id: '4.7',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Turn an objection into content',
    audience: 'both',
    prompt:
      'The most common objection I hear about [product/idea/topic] is [objection]. Turn addressing that objection into a piece of content, not a defensive rebuttal.',
    why: 'pre-empts sales conversations before they happen.',
  },
  {
    id: '4.8',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Write a caption that ends with a real CTA',
    audience: 'both',
    prompt:
      'Write a caption for this post about [topic] that ends with a call-to-action tied to something the reader actually wants, not a generic \'follow for more.\'',
    why: 'a specific incentive beats a generic ask, always.',
  },
  {
    id: '4.9',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Build a content calendar from constraints',
    audience: 'professionals',
    prompt:
      'I can realistically post [frequency] on [platform] about [niche]. Build me a content calendar for the next [timeframe] that mixes formats so it doesn\'t feel repetitive.',
    why: 'a sustainable cadence beats a sporadic burst that burns out in two weeks.',
  },
  {
    id: '4.10',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Qualify a lead before reaching out',
    audience: 'professionals',
    prompt:
      'Here\'s what I know about this lead: [details]. Based on this, is this a good- fit prospect for [product/service], and what\'s the single most relevant thing to lead with if I reach out?',
    why: 'focuses effort before it\'s spent, not after.',
  },
  {
    id: '4.11',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Write a subject line that gets opened',
    audience: 'professionals',
    prompt:
      'Write 8 subject lines for an email about [topic/offer]. Optimize for curiosity or specificity, not urgency or hype.',
    why: 'curiosity earns opens without feeling spammy.',
  },
  {
    id: '4.12',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Repurpose one piece across formats',
    audience: 'both',
    prompt:
      'Here\'s a piece of long-form content: [paste/describe]. Turn it into a short social post, a one-line quote graphic, and a 3-slide carousel, each rewritten for how people actually consume that format, not just cut down.',
    why: 'format-native repurposing beats copy-pasting and shrinking.',
  },
  {
    id: '4.13',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Diagnose why content underperformed',
    audience: 'professionals',
    prompt:
      'This piece of content underperformed: [describe/paste]. Compared to what I know performs well for this audience, what\'s the most likely reason: hook, format, timing, or relevance?',
    why: 'diagnosis before you repeat the same mistake next week.',
  },
  {
    id: '4.14',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Write a bio that says what you actually do',
    audience: 'both',
    prompt:
      'Here\'s a rough description of what I do: [description]. Write 3 versions of a short bio for [platform], each emphasizing a different angle (expertise, personality, outcome).',
    why: 'gives you positioning options instead of one guess.',
  },
  {
    id: '4.15',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Turn a case study into a story',
    audience: 'professionals',
    prompt:
      'Here\'s the raw outcome of a project: [details]. Turn this into a short story with a real before/after, not a bullet list of results.',
    why: 'narrative holds attention far longer than stats alone.',
  },
  {
    id: '4.16',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Write a comment-keyword CTA that doesn\'t feel gimmicky',
    audience: 'both',
    prompt:
      'I\'m giving away [resource] in exchange for a comment with the word [keyword]. Write a CTA line that explains this naturally, without sounding like a growth hack.',
    why: 'transparency preserves trust in the mechanic itself.',
  },
  {
    id: '4.17',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Build a student\'s first content plan',
    audience: 'students',
    prompt:
      'I\'m a student starting to build an audience around [interest/niche]. I have no existing following. Build me a realistic first-month content plan that accounts for having zero credibility yet.',
    why: 'starts from real constraints instead of aspirational ones.',
  },
  {
    id: '4.18',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Write a pitch that leads with their problem',
    audience: 'professionals',
    prompt:
      'I want to pitch [service/product] to [type of prospect]. Write an opening paragraph that starts with their specific problem, not my solution.',
    why: 'problem-first pitches get read further before being dismissed.',
  },
  {
    id: '4.19',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Turn negative feedback into a response',
    audience: 'both',
    prompt:
      'Someone left this critical comment/review: [paste]. Write a response that acknowledges the specific point without being defensive or over-apologizing.',
    why: 'calibrated tone protects your reputation either way this goes.',
  },
  {
    id: '4.20',
    categoryId: 4,
    category: 'Content & Growth',
    title: 'Find the one metric that actually matters this week',
    audience: 'professionals',
    prompt:
      'Here\'s what I\'m tracking: [list metrics]. If I could only look at one number this week to know if things are working, which should it be, and why?',
    why: 'forces focus instead of dashboard-staring.',
  },
  {
    id: '5.1',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Build a full visual prompt from a vague idea',
    audience: 'both',
    prompt:
      'I want an image of [vague idea]. Turn this into a full prompt specifying subject, action, environment, lighting, camera angle, and art style, then ask me which style direction I want before finalizing.',
    why: 'forces the specificity generators actually need to work well.',
  },
  {
    id: '5.2',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Diagnose why a generated image looks off',
    audience: 'both',
    prompt:
      'Here\'s the prompt I used and a description of what came out wrong: [prompt] → [what\'s wrong]. Tell me which part of the prompt is most likely causing that specific problem.',
    why: 'debugs the prompt instead of retrying blindly and hoping.',
  },
  {
    id: '5.3',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Write a consistent character description',
    audience: 'professionals',
    prompt:
      'I need the same character to appear across multiple generated images. Write a locked character description (physical details, outfit, distinguishing features) precise enough to stay consistent across separate generations.',
    why: 'consistency requires precision, not just repeating a name.',
  },
  {
    id: '5.4',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Translate a mood into visual language',
    audience: 'both',
    prompt:
      'I want an image that feels like [mood/emotion], not that depicts it literally. Translate that feeling into concrete visual choices: color palette, lighting direction, composition, and camera distance.',
    why: 'moods have to become describable specifics before a generator can render them.',
  },
  {
    id: '5.5',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Storyboard before generating video',
    audience: 'professionals',
    prompt:
      'I want a short video of [concept]. Break it into a shot-by-shot storyboard first (what\'s in frame, camera movement, and duration per shot) before writing generation prompts for each.',
    why: 'plans the sequence before you spend generations discovering it doesn\'t work.',
  },
  {
    id: '5.6',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Write a camera-language prompt',
    audience: 'both',
    prompt:
      'Rewrite this prompt using proper camera/cinematography language (shot type, lens feel, camera movement) instead of vague descriptors like \'cinematic.\' [paste prompt]',
    why: 'specific camera terms consistently outperform vague style words.',
  },
  {
    id: '5.7',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Generate style-transfer instructions',
    audience: 'both',
    prompt:
      'I like the visual style of [reference, described in words]. Break that style down into its component parts (color, texture, linework, lighting) so I can apply it to a completely different subject.',
    why: 'separates style from subject so it actually transfers cleanly.',
  },
  {
    id: '5.8',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Prompt for a specific animation principle',
    audience: 'students',
    prompt:
      'I\'m animating [action/object] and want it to follow the animation principle of [e.g. squash and stretch, anticipation]. Describe what that would concretely look like frame-to-frame for this specific action.',
    why: 'connects animation theory to a specific, executable frame breakdown.',
  },
  {
    id: '5.9',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Write a negative prompt that actually helps',
    audience: 'both',
    prompt:
      'Here\'s my prompt: [prompt]. What are the 5 most likely unwanted elements a generator would add, so I can explicitly exclude them?',
    why: 'anticipates common failure modes instead of reacting after a bad result.',
  },
  {
    id: '5.10',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Build a shot list for a screen-recorded video',
    audience: 'both',
    prompt:
      'I\'m making a video about [topic] using screen recordings and simple face-to- camera clips, no advanced editing skill. Build me a shot list that\'s realistic to actually film.',
    why: 'keeps ambition matched to real production capability.',
  },
  {
    id: '5.11',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Match lighting across a sequence',
    audience: 'professionals',
    prompt:
      'I need multiple generated images to feel like they\'re lit by the same light source and time of day. Write a lighting description precise enough to stay consistent across separate prompts.',
    why: 'visual consistency lives in the lighting spec, not luck.',
  },
  {
    id: '5.12',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Turn a product into a scene',
    audience: 'professionals',
    prompt:
      'I want to showcase [product] in a generated scene, not on a plain background. Suggest 3 environments that would make sense contextually and describe each in full prompt-ready detail.',
    why: 'context sells a product better than isolation does.',
  },
  {
    id: '5.13',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Write a prompt for a specific emotion on a face',
    audience: 'both',
    prompt:
      'I need a generated character/face expressing [specific emotion], not a generic expression. Describe the exact facial and postural details that would convey that emotion, not just the emotion\'s name.',
    why: 'emotions need physical description, not a label, to render convincingly.',
  },
  {
    id: '5.14',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Explain why my video prompt produced weird motion',
    audience: 'students',
    prompt:
      'Here\'s my video generation prompt: [prompt]. The motion came out wrong in [specific way]. What part of the prompt likely caused that, and how should I rephrase the action description?',
    why: 'diagnoses motion-description failures specifically instead of rewriting from scratch.',
  },
  {
    id: '5.15',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Build a moodboard prompt set',
    audience: 'both',
    prompt:
      'I want to explore 5 different visual directions for [project] before committing. Write 5 distinct full prompts, each representing a genuinely different style, not minor variations of one idea.',
    why: 'real range beats five near-duplicate options.',
  },
  {
    id: '5.16',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Design a simple animated loop',
    audience: 'students',
    prompt:
      'I want a short looping animation of [simple concept] for a portfolio piece. Describe the start frame, end frame, and what needs to match between them for the loop to feel seamless.',
    why: 'loops live or die on the seam, so plan it explicitly instead of hoping.',
  },
  {
    id: '5.17',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Write a prompt using composition rules',
    audience: 'both',
    prompt:
      'Rewrite this prompt to specify a composition rule (rule of thirds, leading lines, framing) instead of just describing the subject. [paste prompt]',
    why: 'composition control is the detail most people skip entirely.',
  },
  {
    id: '5.18',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Match a brand\'s visual identity in a generated asset',
    audience: 'professionals',
    prompt:
      'Here\'s my brand\'s visual identity: [colors, fonts, tone]. Write a generation prompt for [asset] that would actually look on-brand, not just aesthetically nice.',
    why: 'aesthetic quality isn\'t the same thing as brand fit.',
  },
  {
    id: '5.19',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Prompt for a specific texture or material',
    audience: 'both',
    prompt:
      'I need [object] to look like it\'s made of [material] convincingly. Describe the specific surface qualities (reflectivity, texture, how light interacts with it) that sell that material.',
    why: 'materials are sold through light behavior, not the material\'s name.',
  },
  {
    id: '5.20',
    categoryId: 5,
    category: 'AI Image, Video & Animation Generation',
    title: 'Critique your own generated output like a director',
    audience: 'both',
    prompt:
      'Here\'s the image/video I generated and the prompt I used: [describe/paste]. Critique it like a director reviewing a shot: what\'s technically off, and what\'s the single next prompt revision that would fix the biggest problem first?',
    why: 'one prioritized fix beats a list of everything that\'s wrong.',
  },
];
