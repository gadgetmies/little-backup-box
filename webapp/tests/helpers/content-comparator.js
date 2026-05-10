import { normalizeText } from './test-utils.js';

export class ContentComparator {
  compareText(actual, expected, options = {}) {
    const { caseSensitive = false, ignoreWhitespace = true } = options;
    
    let actualNormalized = actual || '';
    let expectedNormalized = expected || '';

    if (!caseSensitive) {
      actualNormalized = actualNormalized.toLowerCase();
      expectedNormalized = expectedNormalized.toLowerCase();
    }

    if (ignoreWhitespace) {
      actualNormalized = normalizeText(actualNormalized);
      expectedNormalized = normalizeText(expectedNormalized);
    }

    return actualNormalized === expectedNormalized;
  }

  compareArrays(actual, expected, options = {}) {
    const { allowPartial = false, orderMatters = false } = options;

    if (!allowPartial && actual.length !== expected.length) {
      return {
        match: false,
        reason: `Length mismatch: expected ${expected.length}, got ${actual.length}`,
      };
    }

    const actualNormalized = actual.map((item) => normalizeText(item));
    const expectedNormalized = expected.map((item) => normalizeText(item));

    if (!orderMatters) {
      actualNormalized.sort();
      expectedNormalized.sort();
    }

    const missing = expectedNormalized.filter(
      (item) => !actualNormalized.some((a) => a.includes(item) || item.includes(a))
    );
    const extra = actualNormalized.filter(
      (item) => !expectedNormalized.some((e) => e.includes(item) || item.includes(e))
    );

    return {
      match: missing.length === 0 && (allowPartial || extra.length === 0),
      missing,
      extra,
    };
  }

  findSimilarText(actual, expectedList, threshold = 0.8) {
    const actualNormalized = normalizeText(actual);
    let bestMatch = null;
    let bestScore = 0;

    for (const expected of expectedList) {
      const expectedNormalized = normalizeText(expected);
      const score = this.calculateSimilarity(actualNormalized, expectedNormalized);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = expected;
      }
    }

    return bestScore >= threshold ? bestMatch : null;
  }

  calculateSimilarity(str1, str2) {
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0.0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  verifyContentMatch(actualContent, expectedContent, context = '') {
    const match = this.compareText(actualContent, expectedContent);
    return {
      match,
      actual: actualContent,
      expected: expectedContent,
      context,
    };
  }
}

