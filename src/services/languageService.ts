/**
 * A comprehensive map of language codes to their full English names.
 * This is easily expandable.
 */
const languageMap = new Map([
  ['en', 'English'],
  ['es', 'Spanish'],
  ['fr', 'French'],
  ['de', 'German'],
  ['it', 'Italian'],
  ['pt', 'Portuguese'],
  ['ru', 'Russian'],
  ['zh', 'Chinese (Mandarin)'],
  ['ja', 'Japanese'],
  ['ko', 'Korean'],
  ['ar', 'Arabic'],
  ['hi', 'Hindi'],
  ['vi', 'Vietnamese'],
  ['tr', 'Turkish'],
]);

/**
 * Converts a language code into its full English name.
 * Ideal for generating human-readable text for AI prompts.
 *
 * @param {string} code - The ISO 639-1 language code (e.g., 'es', 'fr').
 * @returns {string} The full language name (e.g., 'Spanish') or a fallback string if the code is not found.
 */
export const getLanguageNameByCode = (code: string): string => {
  if (!code || typeof code !== 'string') {
    return 'the specified language'; // Default fallback for invalid input
  }
  return languageMap.get(code.toLowerCase()) || `the language "${code}"`;
};