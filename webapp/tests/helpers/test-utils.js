export async function waitForApiCall(page, urlPattern, timeout = 10000) {
  return page.waitForResponse(
    (response) => response.url().includes(urlPattern) && response.status() === 200,
    { timeout }
  );
}

export async function waitForElement(page, selector, options = {}) {
  return page.waitForSelector(selector, { timeout: 10000, ...options });
}

export function normalizeText(text) {
  if (!text) return '';
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .toLowerCase();
}

export function extractVisibleText(element) {
  if (!element) return '';
  return element.textContent?.trim() || '';
}

export async function getTextContent(page, selector) {
  const element = await page.$(selector);
  if (!element) return '';
  return extractVisibleText(element);
}

export async function getAllTextContent(page, selector) {
  const elements = await page.$$(selector);
  return elements.map(extractVisibleText).filter(Boolean);
}







