import type { ExpressionId } from '../../mascot/types';

export interface ExpressionValues {
  /** Eye height multiplier (1 = natural). */
  eyeOpen: number;
  /** Mouth arc: 1 = broad smile, 0 = flat, negative = frown. */
  smile: number;
  /** Open-mouth interior height. */
  open: number;
  browLift: number;
  /** Positive = inner ends down (focused/determined). */
  browTilt: number;
  cheek: number;
  earLift: number;
  headTilt: number;
  /** Mouth width multiplier minus one. */
  wide: number;
  /** Oscillates the open mouth (speech). */
  talk: number;
  /** Quick vertical shake of the head (laughter). */
  shake: number;
}

const e = (label: string, v: Partial<ExpressionValues>): ExpressionValues & { label: string } => ({
  label, eyeOpen: 1, smile: 0.4, open: 0, browLift: 0, browTilt: 0, cheek: 0.35, earLift: 0, headTilt: 0, wide: 0, talk: 0, shake: 0, ...v,
});

export const EXPRESSIONS: Record<ExpressionId, ExpressionValues & { label: string }> = {
  neutral: e('Neutral', {}),
  happy: e('Smile', { eyeOpen: 0.84, smile: 1, open: 0.15, browLift: 0.35, browTilt: -0.1, cheek: 1, earLift: 0.06, headTilt: 0.03, wide: 0.1 }),
  excited: e('Excited', { eyeOpen: 1.14, smile: 1, open: 0.75, browLift: 0.9, browTilt: -0.15, cheek: 1, earLift: 0.14, wide: 0.25 }),
  sleepy: e('Sleepy', { eyeOpen: 0.14, smile: 0.2, browLift: -0.2, browTilt: -0.05, cheek: 0.5, earLift: -0.1, headTilt: 0.06 }),
  curious: e('Curious', { eyeOpen: 1.1, smile: 0.22, browLift: 0.7, browTilt: -0.1, cheek: 0.3, earLift: 0.12, headTilt: 0.14 }),
  surprised: e('Surprised', { eyeOpen: 1.28, smile: 0.02, open: 0.9, browLift: 1, cheek: 0.2, earLift: 0.2 }),
  focused: e('Focused', { eyeOpen: 0.8, smile: 0.02, browLift: -0.15, browTilt: 0.4, cheek: 0.1, earLift: -0.02 }),
  worried: e('Worried', { eyeOpen: 1.05, smile: -0.35, browLift: 0.8, browTilt: -0.55, cheek: 0.1, earLift: -0.12, headTilt: -0.05, wide: -0.1 }),
  confused: e('Confused', { eyeOpen: 1.02, smile: -0.1, open: 0.1, browLift: 0.6, browTilt: 0.35, cheek: 0.2, earLift: 0.05, headTilt: -0.18, wide: -0.2 }),
  pout: e('Pout', { eyeOpen: 0.9, smile: -0.55, browLift: -0.2, browTilt: 0.35, cheek: 0.7, earLift: -0.08, wide: -0.35 }),
  laughing: e('Laughing', { eyeOpen: 0.45, smile: 1, open: 1, browLift: 0.5, cheek: 1, earLift: 0.1, wide: 0.3, shake: 1 }),
  shocked: e('Shocked', { eyeOpen: 1.38, smile: -0.1, open: 1, browLift: 1, cheek: 0, earLift: 0.24, wide: -0.15 }),
  talking: e('Talking', { eyeOpen: 1, smile: 0.6, open: 0.4, browLift: 0.25, cheek: 0.5, earLift: 0.03, talk: 1 }),
  relaxed: e('Relaxed', { eyeOpen: 0.7, smile: 0.7, browLift: 0.1, cheek: 0.8, earLift: -0.04, headTilt: 0.04 }),
};

export const EXPRESSION_IDS = Object.keys(EXPRESSIONS) as ExpressionId[];
