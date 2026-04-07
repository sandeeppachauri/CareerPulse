// services/profileAnalyzer.js — LinkedIn profile AI analysis
const axios = require('axios');

/**
 * Rule-based profile analysis (always works, no API key needed)
 */
function ruleBasedAnalysis(user) {
  const sections = {};
  const suggestions = [];
  const keywords_missing = [];

  // Photo & basic info (proxy: avatar initials = name filled in)
  sections.photo_banner = user.avatar_initials ? 85 : 30;

  // Headline / Role
  const hasDetailedRole = user.current_role && user.current_role.split(' ').length >= 3;
  sections.headline = hasDetailedRole ? 80 : 45;
  if (!hasDetailedRole) {
    suggestions.push({
      priority: 'high',
      icon: '🏷️',
      title: 'Improve your headline',
      detail: 'Add your key skills to your headline (e.g., "Sr. Integration Engineer | Oracle SOA | Kafka | Java"). This can increase profile views by 2x.',
      action: 'Edit Headline'
    });
  }

  // LinkedIn URL (proxy: linkedin_url field)
  sections.linkedin_url = user.linkedin_url ? 90 : 20;
  if (!user.linkedin_url) {
    suggestions.push({
      priority: 'easy',
      icon: '🔗',
      title: 'Add your LinkedIn profile URL',
      detail: 'Add your LinkedIn URL so we can analyze your full profile and provide better suggestions.',
      action: 'Add URL'
    });
  }

  // Skills
  const skills = JSON.parse(user.skills || '[]');
  sections.skills = Math.min(100, skills.length * 10 + 10);
  if (skills.length < 5) {
    suggestions.push({
      priority: 'high',
      icon: '⚡',
      title: 'Add more skills to your profile',
      detail: `You have ${skills.length} skills listed. Profiles with 10+ skills get 5x more recruiter views. Add: Apache Kafka, Oracle SOA, XSLT, JMS, REST API, Spring Boot.`,
      action: 'Add Skills'
    });
    keywords_missing.push('Apache Kafka', 'Oracle SOA Suite', 'XSLT', 'JMS', 'Spring Boot', 'Microservices');
  }

  // Experience
  sections.experience = user.years_exp >= 3 ? 85 : (user.years_exp > 0 ? 60 : 30);

  // Summary (we can't check this without LinkedIn, so we give a generic suggestion)
  sections.summary = 50;
  suggestions.push({
    priority: 'high',
    icon: '✍️',
    title: 'Rewrite your LinkedIn Summary section',
    detail: 'A compelling 150-word summary that covers your value proposition, key achievements, and career goals can increase profile views by 3x. Include keywords like integration, middleware, and your tech stack.',
    action: 'Generate with AI'
  });

  // Recommendations
  sections.recommendations = 35;
  suggestions.push({
    priority: 'medium',
    icon: '⭐',
    title: 'Request 3 LinkedIn recommendations',
    detail: 'Profiles with 3+ recommendations get 4x more InMail responses from recruiters. Reach out to your past managers or senior colleagues.',
    action: 'Draft Request'
  });

  // Activity / posting
  sections.activity = 40;
  suggestions.push({
    priority: 'strategic',
    icon: '📝',
    title: 'Post 2x per week for 30 days',
    detail: 'Consistent posting about middleware engineering, Kafka patterns, or Oracle SOA tips can grow your network by 40% and increase recruiter visibility by 3x.',
    action: 'Get Content Ideas'
  });

  suggestions.push({
    priority: 'easy',
    icon: '📸',
    title: 'Add a professional LinkedIn Banner',
    detail: 'A domain-specific banner (tech/integration theme) sets the right tone and makes your profile memorable. We can suggest templates.',
    action: 'Browse Templates'
  });

  // Compute overall
  const scoreValues = Object.values(sections);
  const overall_score = Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length);

  return {
    overall_score,
    section_scores: sections,
    suggestions,
    keywords_missing,
    ai_summary: `Your profile has a solid foundation with ${user.years_exp || 0}+ years of experience. Key focus areas: strengthen your Summary, add missing technical keywords (${keywords_missing.slice(0,3).join(', ')}), and request recommendations from colleagues.`
  };
}

/**
 * AI-powered analysis using Claude API (requires ANTHROPIC_API_KEY)
 */
async function analyzeWithAI(user) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('No Anthropic API key');

  const userContext = `
    Name: ${user.name}
    Current Role: ${user.current_role || 'Not specified'}
    Years of Experience: ${user.years_exp || 0}
    LinkedIn URL: ${user.linkedin_url || 'Not provided'}
    Skills: ${user.skills || '[]'}
    Location: ${user.location || 'India'}
  `;

  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `You are a LinkedIn profile optimization expert. Analyze this professional's profile data and return ONLY a JSON object (no markdown, no explanation).

Profile Data:
${userContext}

Return this exact JSON structure:
{
  "overall_score": <number 0-100>,
  "section_scores": {
    "headline": <0-100>,
    "summary": <0-100>,
    "experience": <0-100>,
    "skills": <0-100>,
    "photo_banner": <0-100>,
    "recommendations": <0-100>,
    "activity": <0-100>
  },
  "suggestions": [
    {
      "priority": "<high|medium|easy|strategic>",
      "icon": "<emoji>",
      "title": "<short title>",
      "detail": "<detailed actionable suggestion>",
      "action": "<button label>"
    }
  ],
  "keywords_missing": ["<skill1>", "<skill2>"],
  "ai_summary": "<2-3 sentence overview of profile strength and key improvements>"
}`
    }]
  }, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    timeout: 30000
  });

  const text = response.data.content[0].text.trim();
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

/**
 * Main analyze function — tries AI first, falls back to rule-based
 */
async function analyze(user) {
  try {
    const aiResult = await analyzeWithAI(user);
    console.log(`✅ AI analysis complete for user ${user.id}`);
    return aiResult;
  } catch (err) {
    console.log(`⚠️  AI analysis unavailable (${err.message}), using rule-based analysis`);
    return ruleBasedAnalysis(user);
  }
}

module.exports = { analyze, ruleBasedAnalysis };
