// services/matchService.js — Computes job-profile match scores
// Uses TF-IDF style keyword matching (no external dependencies)

const ROLE_KEYWORDS = {
  'oracle soa': ['oracle soa', 'soa suite', 'bpel', 'bam', 'mediator', 'oracle fusion'],
  'oracle osb': ['oracle osb', 'osb', 'oracle service bus', 'proxy service', 'pipeline'],
  'kafka': ['apache kafka', 'kafka', 'kafka streams', 'schema registry', 'confluent'],
  'java': ['java', 'spring boot', 'spring framework', 'jvm', 'j2ee', 'jakarta ee'],
  'middleware': ['middleware', 'enterprise integration', 'esb', 'message broker', 'integration platform'],
  'oracle aq': ['oracle aq', 'oracle advanced queuing', 'aq', 'jms'],
  'rabbitmq': ['rabbitmq', 'amqp', 'message queue'],
  'xslt': ['xslt', 'xsl transformation', 'xml transformation'],
  'microservices': ['microservices', 'micro-services', 'service mesh', 'api gateway'],
  'rest api': ['rest', 'restful', 'rest api', 'openapi', 'swagger'],
};

/**
 * Compute a 0-100 match score between a job and a user's profile
 */
function computeMatchScore(job, userRole, userSkills = []) {
  if (!job || !job.title) return 50;

  const jobText = [
    job.title || '',
    job.description || '',
    job.company || '',
    ...(Array.isArray(job.skills_required) ? job.skills_required : JSON.parse(job.skills_required || '[]'))
  ].join(' ').toLowerCase();

  const userText = [
    userRole || '',
    ...userSkills
  ].join(' ').toLowerCase();

  let score = 40; // Base score for any active user

  // ── 1. Title match (0-30 pts) ──────────────────────────────────────────
  const titleWords = (userRole || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const jobTitle = job.title.toLowerCase();
  let titleMatch = 0;
  titleWords.forEach(word => {
    if (jobTitle.includes(word)) titleMatch += 10;
  });
  score += Math.min(titleMatch, 30);

  // ── 2. Skill keyword matches (0-40 pts) ───────────────────────────────
  const userRoleLower = userRole?.toLowerCase() || '';
  let skillScore = 0;

  for (const [category, synonyms] of Object.entries(ROLE_KEYWORDS)) {
    const userHasSkill = synonyms.some(kw => userRoleLower.includes(kw) || userSkills.some(s => s.toLowerCase().includes(kw)));
    const jobHasSkill = synonyms.some(kw => jobText.includes(kw));

    if (userHasSkill && jobHasSkill) {
      skillScore += 8; // Strong match
    } else if (jobHasSkill && !userHasSkill) {
      skillScore -= 2; // Slight penalty for missing skill
    }
  }

  score += Math.max(0, Math.min(skillScore, 40));

  // ── 3. Location bonus (0-10 pts) ──────────────────────────────────────
  if (job.work_mode === 'remote') score += 5;
  if ((job.location || '').toLowerCase().includes('noida') ||
      (job.location || '').toLowerCase().includes('delhi') ||
      (job.location || '').toLowerCase().includes('ncr')) {
    score += 5;
  }

  // ── 4. Seniority match (0-10 pts) ─────────────────────────────────────
  const seniorityTerms = ['senior', 'lead', 'architect', 'principal', 'staff'];
  const isSeniorJob = seniorityTerms.some(t => jobTitle.includes(t));
  const isSeniorUser = seniorityTerms.some(t => userRoleLower.includes(t));
  if (isSeniorJob && isSeniorUser) score += 10;
  else if (!isSeniorJob && !isSeniorUser) score += 5;

  return Math.max(10, Math.min(100, Math.round(score)));
}

/**
 * Get salary label in LPA
 */
function formatSalary(min, max, currency = 'INR') {
  if (!min && !max) return null;
  const toL = (n) => (n / 100000).toFixed(0);
  if (min && max) return `₹${toL(min)}-${toL(max)} LPA`;
  if (min) return `₹${toL(min)}+ LPA`;
  if (max) return `Up to ₹${toL(max)} LPA`;
}

module.exports = { computeMatchScore, formatSalary };
