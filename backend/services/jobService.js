// services/jobService.js — Fetches jobs from multiple portals
const axios = require('axios');
const RSSParser = require('rss-parser');
const { getDb } = require('../config/database');

const parser = new RSSParser();

// ── Adzuna API (free tier: 250 calls/month) ───────────────────────────────
async function fetchFromAdzuna(keywords, location = 'india') {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  try {
    const q = encodeURIComponent(keywords);
    const loc = encodeURIComponent(location);
    const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=20&what=${q}&where=${loc}&content-type=application/json`;
    const res = await axios.get(url, { timeout: 10000 });
    return (res.data.results || []).map(j => ({
      external_id: j.id,
      source: 'adzuna',
      title: j.title,
      company: j.company?.display_name || 'Unknown',
      location: j.location?.display_name || location,
      description: j.description,
      salary_min: j.salary_min ? Math.round(j.salary_min / 100000) * 100000 : null,
      salary_max: j.salary_max ? Math.round(j.salary_max / 100000) * 100000 : null,
      url: j.redirect_url,
      posted_at: j.created,
      work_mode: j.title?.toLowerCase().includes('remote') ? 'remote' :
                 j.title?.toLowerCase().includes('hybrid') ? 'hybrid' : 'on-site',
      skills_required: extractSkills(j.description),
    }));
  } catch (err) {
    console.error('Adzuna fetch error:', err.message);
    return [];
  }
}

// ── JSearch API (RapidAPI - free tier 200 calls/month) ───────────────────
async function fetchFromJSearch(keywords, location = 'India') {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await axios.get('https://jsearch.p.rapidapi.com/search', {
      params: { query: `${keywords} in ${location}`, page: 1, num_pages: 1 },
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      },
      timeout: 10000
    });

    return (res.data.data || []).map(j => ({
      external_id: j.job_id,
      source: j.job_apply_link?.includes('linkedin') ? 'linkedin' :
              j.job_apply_link?.includes('naukri') ? 'naukri' :
              j.job_apply_link?.includes('indeed') ? 'indeed' : 'jsearch',
      title: j.job_title,
      company: j.employer_name,
      company_logo: j.employer_logo,
      location: `${j.job_city || ''} ${j.job_country || 'India'}`.trim(),
      description: j.job_description,
      salary_min: j.job_min_salary,
      salary_max: j.job_max_salary,
      url: j.job_apply_link,
      posted_at: j.job_posted_at_datetime_utc,
      work_mode: j.job_is_remote ? 'remote' : 'on-site',
      job_type: j.job_employment_type?.toLowerCase() || 'full-time',
      skills_required: extractSkills(j.job_description),
    }));
  } catch (err) {
    console.error('JSearch fetch error:', err.message);
    return [];
  }
}

// ── Indeed RSS (free, no API key) ─────────────────────────────────────────
async function fetchFromIndeedRSS(keywords, location = 'India') {
  try {
    const q = encodeURIComponent(keywords);
    const l = encodeURIComponent(location);
    const url = `https://www.indeed.com/rss?q=${q}&l=${l}&sort=date`;
    const feed = await parser.parseURL(url);
    return (feed.items || []).slice(0, 15).map((item, i) => ({
      external_id: `indeed-${Buffer.from(item.link || '').toString('base64').slice(0, 20)}-${i}`,
      source: 'indeed',
      title: item.title?.replace(' - Indeed', '').split(' - ')[0] || 'Job Opening',
      company: item.title?.split(' - ')[1] || 'Unknown',
      location: item.title?.split(' - ')[2] || location,
      description: item.contentSnippet || item.content,
      url: item.link,
      posted_at: item.pubDate,
      work_mode: (item.title + item.content || '').toLowerCase().includes('remote') ? 'remote' : 'on-site',
      skills_required: extractSkills(item.content || ''),
    }));
  } catch (err) {
    console.error('Indeed RSS error:', err.message);
    return [];
  }
}

// ── Mock jobs (fallback for development) ─────────────────────────────────
function getMockJobs(keywords, location) {
  const keyword = (keywords || 'software engineer').split(' ')[0];
  return [
    { external_id: `mock-1-${Date.now()}`, source: 'naukri', title: `Senior ${keyword} Engineer`, company: 'Infosys BPM', location: 'Noida, UP', work_mode: 'hybrid', salary_min: 2200000, salary_max: 3000000, salary_currency: 'INR', description: `Looking for experienced ${keywords} professional with strong integration background. Must have Oracle SOA/OSB experience.`, url: 'https://www.naukri.com', skills_required: JSON.stringify(['Java', 'Oracle SOA', 'OSB', 'XSLT']), posted_at: new Date().toISOString() },
    { external_id: `mock-2-${Date.now()}`, source: 'linkedin', title: `${keyword} Architect`, company: 'Amazon India', location: 'Bangalore (Remote)', work_mode: 'remote', salary_min: 3000000, salary_max: 4500000, salary_currency: 'INR', description: `${keywords} architect role building large-scale distributed systems and integration platforms.`, url: 'https://www.linkedin.com', skills_required: JSON.stringify(['Apache Kafka', 'Java', 'AWS', 'Microservices']), posted_at: new Date(Date.now() - 86400000).toISOString() },
    { external_id: `mock-3-${Date.now()}`, source: 'naukri', title: `Java Integration Lead`, company: 'TCS Digital', location: 'Hyderabad', work_mode: 'hybrid', salary_min: 2000000, salary_max: 2800000, salary_currency: 'INR', description: `Lead integration projects for enterprise clients. Experience with message queues and middleware required.`, url: 'https://www.naukri.com', skills_required: JSON.stringify(['Java', 'RabbitMQ', 'Oracle AQ', 'Spring Boot']), posted_at: new Date(Date.now() - 2 * 86400000).toISOString() },
    { external_id: `mock-4-${Date.now()}`, source: 'linkedin', title: `Middleware Engineer - OSB/SOA`, company: 'Wipro', location: 'Pune / Remote', work_mode: 'hybrid', salary_min: 2500000, salary_max: 3500000, salary_currency: 'INR', description: `Oracle middleware engineer with OSB, SOA Suite, and JMS/AQ experience. Kafka knowledge is a plus.`, url: 'https://www.linkedin.com', skills_required: JSON.stringify(['Oracle SOA', 'OSB', 'JMS', 'XSLT']), posted_at: new Date(Date.now() - 3 * 86400000).toISOString() },
    { external_id: `mock-5-${Date.now()}`, source: 'indeed', title: `Enterprise Integration Specialist`, company: 'HCL Tech', location: 'Noida / NCR', work_mode: 'on-site', salary_min: 1800000, salary_max: 2600000, salary_currency: 'INR', description: `Design and implement enterprise integration solutions using Oracle and open-source platforms.`, url: 'https://www.indeed.com', skills_required: JSON.stringify(['Oracle AQ', 'Kafka', 'Java', 'REST API']), posted_at: new Date(Date.now() - 4 * 86400000).toISOString() },
    { external_id: `mock-6-${Date.now()}`, source: 'linkedin', title: `Senior Kafka Developer`, company: 'JPMC India', location: 'Mumbai / Remote', work_mode: 'remote', salary_min: 2800000, salary_max: 4000000, salary_currency: 'INR', description: `Build and scale Kafka infrastructure for financial services. Experience with Schema Registry, Kafka Streams required.`, url: 'https://www.linkedin.com', skills_required: JSON.stringify(['Apache Kafka', 'Kafka Streams', 'Java', 'Schema Registry']), posted_at: new Date(Date.now() - 5 * 86400000).toISOString() },
    { external_id: `mock-7-${Date.now()}`, source: 'glassdoor', title: `Oracle SOA Consultant`, company: 'Deloitte USI', location: 'Hyderabad', work_mode: 'hybrid', salary_min: 2000000, salary_max: 3200000, salary_currency: 'INR', description: `Oracle SOA Suite implementation and support for banking and insurance clients.`, url: 'https://www.glassdoor.com', skills_required: JSON.stringify(['Oracle SOA', 'BPEL', 'BAM', 'OSB']), posted_at: new Date(Date.now() - 6 * 86400000).toISOString() },
    { external_id: `mock-8-${Date.now()}`, source: 'indeed', title: `Integration Platform Engineer`, company: 'Bajaj Finserv', location: 'Pune', work_mode: 'on-site', salary_min: 2200000, salary_max: 3000000, salary_currency: 'INR', description: `Build integration platform for fintech products. Must have API gateway and message queue experience.`, url: 'https://www.indeed.com', skills_required: JSON.stringify(['Java', 'Spring Boot', 'Kafka', 'REST API']), posted_at: new Date(Date.now() - 7 * 86400000).toISOString() },
  ];
}

// ── Skill extractor from job description ──────────────────────────────────
function extractSkills(text) {
  if (!text) return JSON.stringify([]);
  const SKILL_KEYWORDS = [
    'Java', 'Python', 'JavaScript', 'Node.js', 'React', 'Angular', 'Spring Boot',
    'Oracle SOA', 'Oracle OSB', 'Apache Kafka', 'RabbitMQ', 'Oracle AQ',
    'XSLT', 'BPEL', 'JMS', 'REST API', 'GraphQL', 'Microservices',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Jenkins', 'Git',
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
    'MuleSoft', 'IBM MQ', 'TIBCO', 'WebLogic', 'JBoss'
  ];
  const found = SKILL_KEYWORDS.filter(skill =>
    text.toLowerCase().includes(skill.toLowerCase())
  );
  return JSON.stringify(found.slice(0, 10));
}

// ── Main sync function ────────────────────────────────────────────────────
async function syncJobs(portals = [], keywords = 'software engineer', location = 'India') {
  const db = getDb();
  let totalSaved = 0;

  const allJobs = [];

  // Try real APIs first
  const [adzunaJobs, jsearchJobs, indeedJobs] = await Promise.all([
    fetchFromAdzuna(keywords, location),
    fetchFromJSearch(keywords, location),
    fetchFromIndeedRSS(keywords, location),
  ]);

  allJobs.push(...adzunaJobs, ...jsearchJobs, ...indeedJobs);

  // Use mock data if no real data
  if (allJobs.length === 0) {
    console.log('📦 Using mock job data (configure API keys for real data)');
    allJobs.push(...getMockJobs(keywords, location));
  }

  const insertJob = db.prepare(`
    INSERT OR IGNORE INTO jobs (external_id, source, title, company, company_logo, location,
      work_mode, job_type, salary_min, salary_max, salary_currency, description, url, skills_required, posted_at)
    VALUES (@external_id, @source, @title, @company, @company_logo, @location,
      @work_mode, @job_type, @salary_min, @salary_max, @salary_currency, @description, @url, @skills_required, @posted_at)
  `);

  const insertMany = db.transaction((jobs) => {
    let count = 0;
    for (const job of jobs) {
      try {
        const result = insertJob.run({
          external_id: job.external_id || `${job.source}-${Date.now()}-${Math.random()}`,
          source: job.source || 'unknown',
          title: job.title || 'Untitled',
          company: job.company || 'Unknown',
          company_logo: job.company_logo || null,
          location: job.location || 'India',
          work_mode: job.work_mode || 'on-site',
          job_type: job.job_type || 'full-time',
          salary_min: job.salary_min || null,
          salary_max: job.salary_max || null,
          salary_currency: job.salary_currency || 'INR',
          description: job.description || '',
          url: job.url || '',
          skills_required: Array.isArray(job.skills_required) ? JSON.stringify(job.skills_required) : (job.skills_required || '[]'),
          posted_at: job.posted_at || new Date().toISOString(),
        });
        if (result.changes > 0) count++;
      } catch (err) {
        // Skip duplicates silently
      }
    }
    return count;
  });

  totalSaved = insertMany(allJobs);
  console.log(`✅ Synced ${totalSaved} new jobs (${allJobs.length} fetched)`);
  return totalSaved;
}

module.exports = { syncJobs, getMockJobs };
