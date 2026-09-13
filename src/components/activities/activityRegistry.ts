import { TogetherActivityId } from '../../states/togetherTypes';

export interface TogetherActivityDefinition {
  id: TogetherActivityId;
  title: string;
  description: string;
  type: 'scenario' | 'turn_based' | 'comparison' | 'daily' | 'categorized';
  icon: string;
  color: string;
}

export const ACTIVITIES_REGISTRY: TogetherActivityDefinition[] = [
  {
    id: 'would_you_rather',
    title: 'Would You Rather',
    description: 'Choose between two tricky scenarios and see if your choices align!',
    type: 'scenario',
    icon: '🤔',
    color: '#ec4899',
  },
  {
    id: 'truth_or_dare',
    title: 'Truth or Dare',
    description: 'Fun, safe, and revealing relationship truths or lighthearted dares!',
    type: 'turn_based',
    icon: '🔥',
    color: '#ef4444',
  },
  {
    id: 'this_or_that',
    title: 'This or That',
    description: 'Quick binary preference choices to test your partner compatibility!',
    type: 'comparison',
    icon: '⚖️',
    color: '#8b5cf6',
  },
  {
    id: 'daily_question',
    title: 'Daily Question',
    description: 'A rotating question every day to connect and reflect together.',
    type: 'daily',
    icon: '📅',
    color: '#10b981',
  },
  {
    id: 'couple_questions',
    title: 'Couple Questions',
    description: 'Explore fun, deep, memory, and future relationship questions.',
    type: 'categorized',
    icon: '💬',
    color: '#f59e0b',
  },
];

export const WOULD_YOU_RATHER_PROMPTS = [
  {
    id: 1,
    prompt: 'Would you rather...',
    options: ['Always travel to a new destination', 'Return to your absolute favorite place every time'],
  },
  {
    id: 2,
    prompt: 'Would you rather...',
    options: ['Have a cozy movie night in', 'Go to a fancy candlelight dinner date'],
  },
  {
    id: 3,
    prompt: 'Would you rather...',
    options: ['Be able to read each other’s minds', 'Always know when the other person needs a hug'],
  },
  {
    id: 4,
    prompt: 'Would you rather...',
    options: ['Live in a bustling beach town', 'Live in a peaceful mountain cabin'],
  },
  {
    id: 5,
    prompt: 'Would you rather...',
    options: ['Cook a gourmet dinner together', 'Order takeout from 3 different favorite places'],
  },
  {
    id: 6,
    prompt: 'Would you rather...',
    options: ['Relive our very first date', 'Fast forward to a surprise dream vacation together'],
  },
];

export const TRUTH_PROMPTS = [
  'What was your exact first impression when we first talked?',
  'What is one tiny habit of mine that you secretly find super cute?',
  'What is a song that always reminds you of us?',
  'What was the moment you realized we had a special connection?',
  'If you could recreate one memory we shared together, which one would it be?',
  'What is one dream or goal you want us to achieve together in the next year?',
];

export const DARE_PROMPTS = [
  'Send a 10-second voice note singing the chorus of our favorite song!',
  'Tell me 3 genuine compliments without using the words "good", "nice", or "cute"!',
  'Do your best impression of how I act when I am hungry or tired!',
  'Share a goofy selfie or funny photo right now in chat!',
  'Write a 4-line mini poem about us in the room comments right now!',
  'Give a dramatic 15-second speech about why we make an awesome team!',
];

export const THIS_OR_THAT_PROMPTS = [
  { id: 1, prompt: 'Preference Check', options: ['Beach 🏖️', 'Mountains 🏔️'] },
  { id: 2, prompt: 'Routine Check', options: ['Early Bird 🌅', 'Night Owl 🌌'] },
  { id: 3, prompt: 'Food Mood', options: ['Sweet Treats 🍩', 'Savory Snacks 🍕'] },
  { id: 4, prompt: 'Weekend Vibe', options: ['Road Trip 🚗', 'Cozy Home Staycation 🏠'] },
  { id: 5, prompt: 'Entertainment', options: ['Binge-watching Series 🍿', 'Gaming Together 🎮'] },
  { id: 6, prompt: 'Coffee or Tea?', options: ['Rich Coffee ☕', 'Calming Tea 🍵'] },
];

export const DAILY_QUESTIONS = [
  'What brought a smile to your face today?',
  'What is something simple that made you feel appreciated recently?',
  'If we could drop everything and do something fun right now, what would it be?',
  'What is one thing you are super looking forward to this week?',
  'What new skill or hobby would you love for us to try together?',
  'What is your favorite memory of us from this past month?',
];

export const COUPLE_QUESTIONS_BY_CATEGORY: Record<string, string[]> = {
  fun: [
    'If we were characters in a movie, what genre would it be?',
    'Who would survive longer in a zombie apocalypse: you or me?',
    'If we started a podcast together, what would the topic be?',
    'What is the funniest thing that has ever happened to us together?',
  ],
  memories: [
    'What is your single favorite date we have ever been on?',
    'What was the first thing you noticed about me?',
    'Do you remember the very first text message or conversation we had?',
    'What memory of us always makes you laugh whenever you think about it?',
  ],
  preferences: [
    'What is your ideal lazy Sunday routine for us?',
    'What kind of music do you love listening to when we relax?',
    'If we could redesign our dream living space, what is a must-have item?',
    'What is your ultimate comforting meal or comfort food?',
  ],
  future: [
    'Where is one place in the world you dream of visiting with me?',
    'What is a big milestone you want us to celebrate together?',
    'What is a habit or routine you want us to build together in the future?',
    'How do you imagine our ideal anniversary celebration 5 years from now?',
  ],
  random: [
    'If we had a mascot for our relationship, what animal would it be?',
    'What superpower would be most useful for a couple to share?',
    'If you had to describe our bond in just three words, what would they be?',
    'What dish could we attempt to cook together that would be a total adventure?',
  ],
};
