/** State of the "What's new" story: which card is showing, how long it has shown, and why it may be paused. */
export const SLIDE_MS = 6000;

export type StoryState = {
  idx: number;
  count: number;
  /** Time spent on the current card while not paused, in ms. */
  elapsed: number;
  /** Mouse over the card (desktop). */
  hover: boolean;
  /** Card pressed and held (touch). */
  held: boolean;
  /** Pause button; sticky until pressed again. */
  manual: boolean;
  /** How many times each card has become current; keys its art so only the incoming card replays. */
  visits: number[];
};

export type StoryAction =
  | { type: "tick"; dt: number }
  | { type: "go"; idx: number }
  | { type: "next" }
  | { type: "back" }
  | { type: "hover" | "held"; on: boolean }
  | { type: "toggle" };

export const initStory = (count: number): StoryState => ({
  idx: 0,
  count,
  elapsed: 0,
  hover: false,
  held: false,
  manual: false,
  visits: Array.from({ length: count }, (_, i) => (i === 0 ? 1 : 0)),
});

/** Longest frame the timer will count, so a hidden tab or backgrounded app doesn't skip cards on return. */
export const MAX_FRAME_MS = 100;
export const frameDelta = (prev: number, now: number) => Math.min(MAX_FRAME_MS, Math.max(0, now - prev));

/** Keyboard shortcuts, whatever element has focus: Space pauses (it must not press the focused button). */
export function storyKeyAction(key: string): StoryAction | null {
  if (key === " ") return { type: "toggle" };
  if (key === "ArrowRight") return { type: "next" };
  if (key === "ArrowLeft") return { type: "back" };
  return null;
}

export const isPaused = (s: StoryState) => s.hover || s.held || s.manual;
export const isLast = (s: StoryState) => s.idx >= s.count - 1;

function goTo(s: StoryState, to: number): StoryState {
  const idx = Math.max(0, Math.min(s.count - 1, to));
  const visits = idx === s.idx ? s.visits : s.visits.map((v, i) => (i === idx ? v + 1 : v));
  return { ...s, idx, elapsed: 0, visits };
}

export function storyReducer(s: StoryState, a: StoryAction): StoryState {
  switch (a.type) {
    case "tick": {
      if (isPaused(s)) return s;
      const elapsed = Math.min(SLIDE_MS, s.elapsed + a.dt);
      // The last card's progress bar completes, but it waits for "Got it".
      if (elapsed >= SLIDE_MS && !isLast(s)) return goTo(s, s.idx + 1);
      return elapsed === s.elapsed ? s : { ...s, elapsed };
    }
    case "go":
      return goTo(s, a.idx);
    case "next":
      return goTo(s, s.idx + 1);
    case "back":
      return goTo(s, s.idx - 1);
    case "hover":
      return { ...s, hover: a.on };
    case "held":
      return { ...s, held: a.on };
    case "toggle":
      return { ...s, manual: !s.manual };
  }
}
