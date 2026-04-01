-- ============================================================
-- Migration 018: Platform Enhancements
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add missing user fields (safe - uses IF NOT EXISTS)
ALTER TABLE users ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_role VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_company VARCHAR(255);

-- Add round_topics to company_profiles
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS round_topics JSONB DEFAULT '{}';

-- Update existing companies with round topics for breadth-aware interviews
UPDATE company_profiles SET round_topics = '{
  "DSA Round": ["Arrays & Strings", "Linked Lists", "Trees & Graphs", "Dynamic Programming", "Heaps & Priority Queues", "Bit Manipulation"],
  "System Design": ["Load Balancing", "Caching Strategies", "Database Sharding", "Microservices Architecture", "Event-Driven Systems"],
  "Behavioral": ["Leadership & Ownership", "Conflict Resolution", "Ambiguity Handling", "Cross-Team Collaboration"],
  "Googleyness": ["Culture Fit", "Intellectual Humility", "Growth Mindset", "Roleplaying Ethics"]
}' WHERE name = 'Google';

UPDATE company_profiles SET round_topics = '{
  "Coding x2": ["Algorithm Design", "Time/Space Complexity", "Edge Cases", "Clean Code"],
  "System Design": ["Scalability to Billions", "NoSQL vs SQL", "Real-time Systems", "CDN & Geo-distribution"],
  "Leadership Principles": ["Bias for Action", "Customer Obsession", "Think Big", "Dive Deep"]
}' WHERE name = 'Meta';

UPDATE company_profiles SET round_topics = '{
  "Online Assessment": ["Data Structures", "Algorithms", "Time Complexity"],
  "Behavioral (LP)": ["STAR Stories", "Amazon Leadership Principles", "Customer Obsession Anecdotes"],
  "Technical": ["System Design at Scale", "API Design", "Database Modeling"],
  "Bar Raiser": ["Overall Bar Calibration", "Leadership Principles Deep Dive", "Culture Alignment"]
}' WHERE name = 'Amazon';

UPDATE company_profiles SET round_topics = '{
  "Coding": ["Low-level Implementation", "Memory Management", "Edge Cases", "Algorithmic Efficiency"],
  "System Design": ["Hardware-Software Interface", "API Design", "Distributed Storage", "Privacy at Scale"],
  "Hiring Manager": ["Product Vision Alignment", "Impact Assessment", "Team Fit"]
}' WHERE name = 'Apple';

UPDATE company_profiles SET round_topics = '{
  "Coding x3": ["OOP Design Patterns", "Problem Decomposition", "Optimization", "Recursion & Trees"],
  "Design": ["Object-Oriented Design", "API Design", "Concurrency Patterns"],
  "As Appropriate": ["Growth Mindset", "Learn-It-All Culture", "Cross-Functional Collaboration"]
}' WHERE name = 'Microsoft';

UPDATE company_profiles SET round_topics = '{
  "Bug Fix": ["Debugging Real Code", "Error Handling", "Testing Strategy"],
  "Architecture": ["Payment Systems", "API Security", "Fault Tolerance"],
  "System Design": ["Financial Grade Reliability", "Idempotency", "Multi-region Architecture"]
}' WHERE name = 'Stripe';

UPDATE company_profiles SET round_topics = '{
  "Coding": ["Problem Solving", "Clean Code", "Complexity Analysis"],
  "Cross-functional": ["Product Thinking", "Stakeholder Management", "Community Impact"],
  "System Design": ["Booking Systems", "Search & Discovery", "Review & Trust Systems"]
}' WHERE name = 'Airbnb';

UPDATE company_profiles SET round_topics = '{
  "Coding": ["Algorithms", "Systems Programming", "Code Quality"],
  "System Design": ["Streaming Infrastructure", "Recommendation Systems", "Content Delivery"],
  "Culture Doc Alignment": ["Freedom & Responsibility", "High Performance Culture", "Context vs Control"]
}' WHERE name = 'Netflix';

UPDATE company_profiles SET round_topics = '{
  "Coding": ["Algorithm Design", "Blockchain Basics", "Concurrency"],
  "System Design": ["Distributed Ledger", "Transaction Processing", "Wallet Architecture"],
  "Crypto Knowledge": ["Consensus Mechanisms", "DeFi Concepts", "Smart Contracts", "Web3 Infrastructure"]
}' WHERE name = 'Coinbase';

-- Add analysis and duration to interview_reports if missing
ALTER TABLE interview_reports ADD COLUMN IF NOT EXISTS analysis JSONB DEFAULT '{}';
ALTER TABLE interview_reports ADD COLUMN IF NOT EXISTS duration_seconds INT;

-- Add profile_sections to resumes for input persistence
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS profile_sections JSONB DEFAULT '{}';

-- Add onboarding_complete flag to users for faster auth checks
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

-- Update existing users with target info as complete
UPDATE users SET onboarding_complete = TRUE
WHERE gemini_api_key IS NOT NULL
  AND target_role IS NOT NULL
  AND target_company IS NOT NULL;

-- Add recruiter_role flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_recruiter BOOLEAN DEFAULT FALSE;
