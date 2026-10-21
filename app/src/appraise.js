// Fake appraiser. Contract: contracts/appraise.md §6. Never reads input.photo, never touches the network.
export const FAKE_DELAY_MS = 800

export async function appraise() {
  await new Promise((resolve) => setTimeout(resolve, FAKE_DELAY_MS))
  return { mochi: 3, line: '흠… 사연이 묻어 있구먼.' }
}
