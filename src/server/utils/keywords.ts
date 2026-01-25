/**
 * Extracts normalized keywords from job titles for grouping.
 */
export function extractRoleKeywords(role: string): string[] {
  const normalized = role.toLowerCase();
  const keywords: string[] = [];
  
  const rolePatterns = [
    /software engineer/i, /backend/i, /frontend/i, /full[- ]?stack/i, /mobile/i,
    /ios/i, /android/i, /web/i, /machine learning/i, /\bml\b/i, /\bai\b/i,
    /data scien/i, /data engineer/i, /devops/i, /sre/i, /cloud/i, /security/i,
    /embedded/i, /firmware/i, /qa/i, /test/i, /product manager/i, /\bpm\b/i,
    /quant/i, /hardware/i, /intern/i, /new grad/i, /research/i
  ];
  
  for (const pattern of rolePatterns) {
    if (pattern.test(normalized)) {
      // Clean up the regex source to look nice
      let cleanName = pattern.source
        .replace(/\\b/g, '')
        .replace(/\\/g, '')
        .replace(/\[.*?\]\?/g, ' ') // Handle [- ]? -> space
        .replace(/\[.*?\]/g, '')    // Handle other brackets
        .replace(/\?/g, '');        // Handle remaining ?
        
      cleanName = cleanName.trim().replace(/\s+/g, ' ');
      keywords.push(cleanName);
    }
  }
  return keywords;
}
