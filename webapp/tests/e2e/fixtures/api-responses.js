/**
 * Helper to simulate a delayed API response in tests.
 *
 * @param {*} response - The response value to return
 * @param {number} ms - Delay in milliseconds
 * @returns {Promise<*>}
 */
export function withMockDelay(response, ms) {
  return new Promise((resolve) => setTimeout(() => resolve(response), ms));
}
