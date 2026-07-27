/**
 * Facilitator session guides (FR-26): discussion prompts and printable material
 * references per topic. Placeholder prompts — real guides are authored with the
 * clinical + cultural reviewers (NFR-24). Kept as static config so a facilitator
 * always has something offline; richer materials come from the CMS later.
 */

import type { SessionTopic } from './types.js';

export interface SessionGuide {
  topic: SessionTopic;
  prompts: string[];
  printableUrl: string | null;
}

const PROMPTS: Record<SessionTopic, string[]> = {
  puberty_development: [
    'What changes did you notice at your child’s age, and how did adults explain them to you?',
    'What is one thing you wish you had been told about growing up?',
  ],
  relationships: [
    'How do we talk with our children about friendships and peer pressure?',
    'What makes it hard to start these conversations?',
  ],
  consent: [
    'What does respecting boundaries look like in our homes?',
    'How can we teach a child that “no” must be respected?',
  ],
  srh: [
    'Where do our children get information now, and is it accurate?',
    'How can we become a trusted source instead?',
  ],
  communication: [
    'What is one conversation you want to have with your child this month?',
    'How can we listen without judging?',
  ],
  positive_parenting: [
    'How do we set boundaries with warmth rather than fear?',
    'What is working well in your home that you could share?',
  ],
  safeguarding: [
    'What are the signs that a child may need help?',
    'Where in our community can families go for support?',
  ],
  myths: [
    'What is a common belief about growing up that may not be true?',
    'How do we gently correct misinformation?',
  ],
};

export function getGuide(topic: SessionTopic): SessionGuide {
  return { topic, prompts: PROMPTS[topic], printableUrl: null };
}
