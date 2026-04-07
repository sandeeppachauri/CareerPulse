// database/seed.js — Seeds sample jobs for development/demo
require('dotenv').config();
const { getDb } = require('../config/database');

// Run migrations first
require('./migrate');

const db = getDb();

console.log('\n🌱 Seeding sample data...\n');

const sampleJobs = [
  { external_id: 'seed-1', source: 'naukri', title: 'Senior Oracle SOA/OSB Engineer', company: 'Infosys BPM', location: 'Noida, UP', work_mode: 'hybrid', job_type: 'full-time', salary_min: 2200000, salary_max: 3000000, description: 'Looking for experienced Oracle SOA/OSB engineer with strong integration background. Must have Oracle SOA Suite, OSB, BPEL experience. Kafka knowledge preferred.', skills_required: JSON.stringify(['Oracle SOA', 'OSB', 'BPEL', 'XSLT', 'Java']), url: 'https://www.naukri.com', posted_at: new Date().toISOString() },
  { external_id: 'seed-2', source: 'linkedin', title: 'Apache Kafka Architect', company: 'Amazon India', location: 'Bangalore (Remote)', work_mode: 'remote', job_type: 'full-time', salary_min: 3000000, salary_max: 4500000, description: 'Kafka architect role building large-scale distributed systems. Experience with Kafka Streams, Schema Registry, and Kafka Connect required. Strong Java background needed.', skills_required: JSON.stringify(['Apache Kafka', 'Kafka Streams', 'Java', 'AWS', 'Microservices']), url: 'https://www.linkedin.com', posted_at: new Date(Date.now() - 3600000).toISOString() },
  { external_id: 'seed-3', source: 'naukri', title: 'Java Integration Lead', company: 'TCS Digital', location: 'Hyderabad', work_mode: 'hybrid', job_type: 'full-time', salary_min: 2000000, salary_max: 2800000, description: 'Lead integration projects for enterprise clients. Experience with message queues (RabbitMQ, Oracle AQ) and middleware required. Strong Java/Spring Boot background.', skills_required: JSON.stringify(['Java', 'RabbitMQ', 'Oracle AQ', 'Spring Boot', 'REST API']), url: 'https://www.naukri.com', posted_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { external_id: 'seed-4', source: 'linkedin', title: 'Middleware Engineer - OSB/SOA', company: 'Wipro', location: 'Pune / Remote', work_mode: 'hybrid', job_type: 'full-time', salary_min: 2500000, salary_max: 3500000, description: 'Oracle middleware engineer with OSB, SOA Suite, and JMS/AQ experience. Kafka knowledge is a plus. XSLT and XML proficiency required.', skills_required: JSON.stringify(['Oracle SOA', 'OSB', 'JMS', 'XSLT', 'XML']), url: 'https://www.linkedin.com', posted_at: new Date(Date.now() - 5 * 3600000).toISOString() },
  { external_id: 'seed-5', source: 'indeed', title: 'Enterprise Integration Specialist', company: 'HCL Tech', location: 'Noida / NCR', work_mode: 'on-site', job_type: 'full-time', salary_min: 1800000, salary_max: 2600000, description: 'Design and implement enterprise integration solutions using Oracle and open-source platforms. REST API design and microservices experience needed.', skills_required: JSON.stringify(['Oracle AQ', 'Kafka', 'Java', 'REST API', 'Microservices']), url: 'https://www.indeed.com', posted_at: new Date(Date.now() - 8 * 3600000).toISOString() },
  { external_id: 'seed-6', source: 'linkedin', title: 'Senior Kafka Developer', company: 'JPMC India', location: 'Mumbai / Remote', work_mode: 'remote', job_type: 'full-time', salary_min: 2800000, salary_max: 4000000, description: 'Build and scale Kafka infrastructure for financial services. Experience with Schema Registry, Kafka Streams required. Strong understanding of financial messaging standards.', skills_required: JSON.stringify(['Apache Kafka', 'Kafka Streams', 'Java', 'Schema Registry', 'Spring Boot']), url: 'https://www.linkedin.com', posted_at: new Date(Date.now() - 12 * 3600000).toISOString() },
  { external_id: 'seed-7', source: 'glassdoor', title: 'Oracle SOA Consultant', company: 'Deloitte USI', location: 'Hyderabad', work_mode: 'hybrid', job_type: 'full-time', salary_min: 2000000, salary_max: 3200000, description: 'Oracle SOA Suite implementation and support for banking and insurance clients. BPEL, BAM, Mediator experience required.', skills_required: JSON.stringify(['Oracle SOA', 'BPEL', 'BAM', 'OSB', 'Java']), url: 'https://www.glassdoor.com', posted_at: new Date(Date.now() - 24 * 3600000).toISOString() },
  { external_id: 'seed-8', source: 'indeed', title: 'Integration Platform Engineer', company: 'Bajaj Finserv', location: 'Pune', work_mode: 'on-site', job_type: 'full-time', salary_min: 2200000, salary_max: 3000000, description: 'Build integration platform for fintech products. Must have API gateway and message queue experience. Knowledge of financial protocols a plus.', skills_required: JSON.stringify(['Java', 'Spring Boot', 'Kafka', 'REST API', 'API Gateway']), url: 'https://www.indeed.com', posted_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString() },
  { external_id: 'seed-9', source: 'naukri', title: 'Oracle AQ / JMS Developer', company: 'HDFC Bank', location: 'Mumbai', work_mode: 'hybrid', job_type: 'full-time', salary_min: 2500000, salary_max: 3500000, description: 'Oracle Advanced Queuing and JMS development for banking integration platform. Strong PL/SQL and Java experience required.', skills_required: JSON.stringify(['Oracle AQ', 'JMS', 'Java', 'PL/SQL', 'Oracle SOA']), url: 'https://www.naukri.com', posted_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString() },
  { external_id: 'seed-10', source: 'linkedin', title: 'Integration Architect - MuleSoft/Kafka', company: 'Accenture', location: 'Bangalore / Remote', work_mode: 'remote', job_type: 'full-time', salary_min: 3500000, salary_max: 5000000, description: 'Lead integration architecture for digital transformation projects. MuleSoft, Kafka, and API-led connectivity expertise required.', skills_required: JSON.stringify(['MuleSoft', 'Apache Kafka', 'Java', 'API Design', 'Microservices']), url: 'https://www.linkedin.com', posted_at: new Date(Date.now() - 4 * 24 * 3600000).toISOString() },
  { external_id: 'seed-11', source: 'glassdoor', title: 'Java EE / Jakarta EE Developer', company: 'ThoughtWorks', location: 'Remote (Pan India)', work_mode: 'remote', job_type: 'full-time', salary_min: 2000000, salary_max: 3000000, description: 'Full-stack Java developer with strong enterprise integration background. WebLogic, JBoss, and microservices experience valued.', skills_required: JSON.stringify(['Java', 'Jakarta EE', 'WebLogic', 'JBoss', 'REST API']), url: 'https://www.glassdoor.com', posted_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString() },
  { external_id: 'seed-12', source: 'naukri', title: 'RabbitMQ / Kafka Integration Developer', company: 'Paytm', location: 'Noida', work_mode: 'hybrid', job_type: 'full-time', salary_min: 1800000, salary_max: 2800000, description: 'Message queue integration developer for high-volume fintech platform. RabbitMQ, Kafka, and Redis expertise required.', skills_required: JSON.stringify(['RabbitMQ', 'Apache Kafka', 'Redis', 'Java', 'Spring Boot']), url: 'https://www.naukri.com', posted_at: new Date(Date.now() - 6 * 24 * 3600000).toISOString() },
];

const insertJob = db.prepare(`
  INSERT OR IGNORE INTO jobs (external_id, source, title, company, location, work_mode, job_type, 
    salary_min, salary_max, description, skills_required, url, posted_at)
  VALUES (@external_id, @source, @title, @company, @location, @work_mode, @job_type,
    @salary_min, @salary_max, @description, @skills_required, @url, @posted_at)
`);

const insertAll = db.transaction((jobs) => {
  let count = 0;
  jobs.forEach(j => {
    const r = insertJob.run(j);
    if (r.changes > 0) count++;
  });
  return count;
});

const count = insertAll(sampleJobs);
console.log(`  ✅ Inserted ${count} sample jobs (${sampleJobs.length - count} already existed)\n`);
console.log('✅ Seed complete!\n');

db.close();
