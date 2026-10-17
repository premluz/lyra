export type FormId = 'loop' | 'flowing' | 'conversation' | 'broken' | 'bloom';
export interface FormProfile {
  id: FormId; label: string; description: string; harmony: readonly number[]; dynamics: readonly number[];
  sections: readonly string[]; swing: number; release: number; ring: number;
  contour: readonly number[]; accents: readonly number[];
}
export const COMPOSITION = { phrases: 4, half: 0.5, voiceOverlap: 8,
  octaveSteps: 5, endingSteps: 8, decayMin: 0.18, decayMax: 2.2, bassTail: 0.65, wavyDecayMax: 0.85,
} as const;
export const FORMS: readonly FormProfile[] = [
  { id: 'loop', label: 'Repeating loop', description: 'Play the edited notes as a repeating three-bar theme.',
    harmony: [0], dynamics: [1], sections: ['Theme'], swing: 0, release: 1, ring: 1,
    contour: [0, 1, 2, 1], accents: [1] },
  { id: 'flowing', label: 'Melodic hook', description: 'A repeating plucked hook, short bass notes and a few ringing accents. Small changes keep the original melody recognisable.',
    harmony: [0, 1, 0, -1], dynamics: [0.95, 0.85, 1, 0.9], sections: ['Hook', 'Answer', 'Hook', 'Turnaround'],
    swing: 0.08, release: 0.7, ring: 1.3,
    contour: [0, 2, 3, 4, 2, 1], accents: [1, 0.8, 0.9, 0.75] },
  { id: 'conversation', label: 'Call & response', description: 'The melodic hook stays present while sparse Air notes answer between phrases. Percussive attacks and natural tails keep each sound distinct.',
    harmony: [0, 0, -1, 0], dynamics: [0.9, 0.75, 1, 0.8], sections: ['Call', 'Reply', 'New question', 'Resolve'],
    swing: 0.08, release: 0.65, ring: 1.15,
    contour: [0, 2, 1, 3, 1, 0, -1, 0], accents: [1, 0.65, 0.85, 0.7] },
  { id: 'broken', label: 'Pocket groove', description: 'A catchy hook with offbeat notes, short bass pulses and sharper accents. A few notes ring above the groove.',
    harmony: [0, 2, -1, -2], dynamics: [0.85, 1, 0.7, 0.95], sections: ['Spark', 'Lift', 'Space', 'Return'],
    swing: 0.28, release: 0.4, ring: 1.05,
    contour: [0, 3, 1, 4, 2, 0, 2, -1], accents: [1, 0.5, 0.8, 0.6] },
  { id: 'bloom', label: 'Ringing melody', description: 'A clear melodic hook with longer bell-like endings over a short, warm bass line. Notes glow and decay naturally.',
    harmony: [0, 1, -1, 0], dynamics: [0.9, 0.85, 1, 0.8], sections: ['Hook', 'Echo', 'Lift', 'Home'],
    swing: 0.04, release: 0.8, ring: 1.7,
    contour: [0, 2, 3, 4, 2, 1], accents: [1, 0.85, 0.9, 0.8] },
];
export function isForm(value: unknown): value is FormId { return FORMS.some((form) => form.id === value); }
export function formFor(id: FormId) {
  const form = FORMS.find((form) => form.id === id);
  if (!form) throw new Error(`Unknown composition style ${id}.`);
  return form;
}
