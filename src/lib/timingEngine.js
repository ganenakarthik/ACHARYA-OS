/* ================================================================
   ADAPTIVE TIMING ENGINE — Section IV-B3 (Algorithm 1 & Equation 1)
   "A Context-Aware AI Mentor with Persistent Memory Across Learning Sessions"
   Malla Reddy University — G. Karthik & K. Shalem Raju
   ================================================================ */

/**
 * Computes policy-driven timing usefulness score U according to Equation (1):
 * U = clip( 0.4·E + 0.2·S + 0.2·W + 0.1·P - 0.3·R , 0 , 1 )
 *
 * @param {Object} signals
 * @param {boolean} signals.isDirectQuestion - If learner directly asked a question
 * @param {boolean} signals.hasError - E: 1 if compiler / visible error detected
 * @param {boolean} signals.isStuck - S: 1 if on same screen > 5 minutes (300s)
 * @param {boolean} signals.isWeakTopic - W: 1 if current topic matches learner's weak areas
 * @param {boolean} signals.isNaturalPause - P: 1 at a natural pause (e.g. idle after typing)
 * @param {number} signals.lastHelpTimestamp - Timestamp (ms) when help was last offered
 * @param {number} threshold - Decision boundary (default: 0.5)
 * @returns {Object} { decision: 'HELP_NOW' | 'WAIT', U: number, signals: Object, log: string }
 */
export function evaluateTimingPolicy(signals = {}, threshold = 0.5) {
  // 1. Direct question from learner is always answered immediately
  if (signals.isDirectQuestion) {
    return {
      decision: 'HELP_NOW',
      U: 1.0,
      signals: { E: 1, S: 0, W: 0, P: 1, R: 0 },
      log: 'Direct inquiry from operator → Immediate resolution (U = 1.00)'
    }
  }

  // 2. Evaluate signals E, S, W, P, R
  const E = signals.hasError ? 1 : 0
  const S = signals.isStuck ? 1 : 0
  const W = signals.isWeakTopic ? 1 : 0
  const P = signals.isNaturalPause ? 1 : 0

  const now = Date.now()
  const lastHelp = signals.lastHelpTimestamp || 0
  const secondsSinceHelp = (now - lastHelp) / 1000
  const R = secondsSinceHelp < 120 ? 1 : 0 // 1 if help offered within last 120 seconds

  // 3. Compute U using Eq. (1)
  const rawU = (0.4 * E) + (0.2 * S) + (0.2 * W) + (0.1 * P) - (0.3 * R)
  const U = Math.max(0, Math.min(1, parseFloat(rawU.toFixed(2))))

  // 4. Decision: If U >= threshold → HELP_NOW, else WAIT
  const decision = U >= threshold ? 'HELP_NOW' : 'WAIT'

  const log = `Evaluating Policy: U = clip(0.4·${E} + 0.2·${S} + 0.2·${W} + 0.1·${P} - 0.3·${R}) = ${U.toFixed(2)} [Threshold: ${threshold}] → ${decision}`

  return {
    decision,
    U,
    threshold,
    signals: { E, S, W, P, R },
    log
  }
}
