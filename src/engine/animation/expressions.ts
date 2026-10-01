import type { ExpressionId } from '../../mascot/types';

export interface ExpressionValues {
  /** Eye height multiplier (1 = natural). */
  eyeOpen: number;
  /** Mouth arc height multiplier. */
  smile: number;
  /** Open-mouth interior height. */
  open: number;
  browLift: number;
  /** Positive = inner ends down (focused/determined). */
  browTilt: number;
  cheek: number;
  earLift: number;
  headTilt: number;
}

export const EXPRESSIONS: Record<ExpressionId, ExpressionValues & { label: string }> = {
  neutral: { label: 'Neutral', eyeOpen: 1, smile: 0.4, open: 0, browLift: 0, browTilt: 0, cheek: 0.35, earLift: 0, headTilt: 0 },
  happy: { label: 'Happy', eyeOpen: 0.82, smile: 1, open: 0.2, browLift: 0.35, browTilt: -0.1, cheek: 1, earLift: 0.06, headTilt: 0.03 },
  excited: { label: 'Excited', eyeOpen: 1.12, smile: 1, open: 0.7, browLift: 0.9, browTilt: -0.15, cheek: 1, earLift: 0.14, headTilt: 0 },
  sleepy: { label: 'Sleepy', eyeOpen: 0.14, smile: 0.25, open: 0, browLift: -0.2, browTilt: -0.05, cheek: 0.5, earLift: -0.1, headTilt: 0.06 },
  curious: { label: 'Curious', eyeOpen: 1.1, smile: 0.22, open: 0, browLift: 0.7, browTilt: -0.1, cheek: 0.3, earLift: 0.12, headTilt: 0.14 },
  surprised: { label: 'Surprised', eyeOpen: 1.28, smile: 0.02, open: 0.9, browLift: 1, browTilt: 0, cheek: 0.2, earLift: 0.2, headTilt: 0 },
  focused: { label: 'Focused', eyeOpen: 0.78, smile: 0.02, open: 0, browLift: -0.15, browTilt: 0.4, cheek: 0.1, earLift: -0.02, headTilt: 0 },
};

export const EXPRESSION_IDS = Object.keys(EXPRESSIONS) as ExpressionId[];
