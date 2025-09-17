/**
 * Rule-based scoring logic for lead qualification
 * Maximum possible score from rules: 50 points
 */

const RULE_SCORES = {
  // Role relevance (max 20 points)
  DECISION_MAKER_ROLES: [
    'ceo', 'cto', 'cfo', 'coo', 'president', 'founder', 'owner', 'director', 'vp', 'vice president',
    'head of', 'chief', 'manager', 'lead', 'senior manager'
  ],
  INFLUENCER_ROLES: [
    'senior', 'principal', 'architect', 'specialist', 'analyst', 'coordinator', 'supervisor',
    'team lead', 'project manager', 'product manager'
  ],
  
  // Industry matching keywords for B2B SaaS mid-market
  ICP_INDUSTRIES: [
    'saas', 'software', 'technology', 'tech', 'fintech', 'edtech', 'healthcare tech',
    'b2b', 'enterprise software', 'cloud', 'digital', 'platform', 'api'
  ],
  ADJACENT_INDUSTRIES: [
    'finance', 'financial services', 'consulting', 'marketing', 'advertising', 'media',
    'e-commerce', 'retail', 'healthcare', 'education', 'real estate', 'manufacturing'
  ]
};

/**
 * Calculate rule-based score for a lead
 * @param {Object} lead - Lead data object
 * @param {Object} offer - Offer/product data object
 * @returns {Object} Scoring breakdown with total score and details
 */
function calculateRuleScore(lead, offer) {
  let score = 0;
  const breakdown = {
    roleScore: 0,
    industryScore: 0,
    completenessScore: 0,
    total: 0,
    details: []
  };

  // 1. Role relevance scoring (max 20 points)
  const roleScore = calculateRoleScore(lead.role);
  score += roleScore;
  breakdown.roleScore = roleScore;

  if (roleScore === 20) {
    breakdown.details.push('Decision maker role (+20 points)');
  } else if (roleScore === 10) {
    breakdown.details.push('Influencer role (+10 points)');
  } else {
    breakdown.details.push('Non-decision maker role (0 points)');
  }

  // 2. Industry match scoring (max 20 points)
  const industryScore = calculateIndustryScore(lead.industry, offer);
  score += industryScore;
  breakdown.industryScore = industryScore;

  if (industryScore === 20) {
    breakdown.details.push('Perfect industry match (+20 points)');
  } else if (industryScore === 10) {
    breakdown.details.push('Adjacent industry match (+10 points)');
  } else {
    breakdown.details.push('No industry match (0 points)');
  }

  // 3. Data completeness scoring (max 10 points)
  const completenessScore = calculateCompletenessScore(lead);
  score += completenessScore;
  breakdown.completenessScore = completenessScore;

  if (completenessScore === 10) {
    breakdown.details.push('All fields complete (+10 points)');
  } else {
    breakdown.details.push(`Missing ${6 - countCompleteFields(lead)} fields (-${10 - completenessScore} points)`);
  }

  breakdown.total = Math.min(score, 50); // Cap at 50 points
  return breakdown;
}

/**
 * Calculate role-based score
 */
function calculateRoleScore(role) {
  if (!role) return 0;
  
  const roleLower = role.toLowerCase();
  
  // Check for decision maker roles
  for (const decisionRole of RULE_SCORES.DECISION_MAKER_ROLES) {
    if (roleLower.includes(decisionRole)) {
      return 20;
    }
  }
  
  // Check for influencer roles
  for (const influencerRole of RULE_SCORES.INFLUENCER_ROLES) {
    if (roleLower.includes(influencerRole)) {
      return 10;
    }
  }
  
  return 0;
}

/**
 * Calculate industry match score
 */
function calculateIndustryScore(industry, offer) {
  if (!industry) return 0;
  
  const industryLower = industry.toLowerCase();
  
  // Check against offer's ideal use cases if available
  if (offer && offer.ideal_use_cases) {
    for (const useCase of offer.ideal_use_cases) {
      if (industryLower.includes(useCase.toLowerCase())) {
        return 20;
      }
    }
  }
  
  // Check for exact ICP match
  for (const icpIndustry of RULE_SCORES.ICP_INDUSTRIES) {
    if (industryLower.includes(icpIndustry)) {
      return 20;
    }
  }
  
  // Check for adjacent industry match
  for (const adjacentIndustry of RULE_SCORES.ADJACENT_INDUSTRIES) {
    if (industryLower.includes(adjacentIndustry)) {
      return 10;
    }
  }
  
  return 0;
}

/**
 * Calculate data completeness score
 */
function calculateCompletenessScore(lead) {
  const completeFields = countCompleteFields(lead);
  const totalFields = 6; // name, role, company, industry, location, linkedin_bio
  
  if (completeFields === totalFields) {
    return 10;
  }
  
  // Partial credit for completeness
  return Math.floor((completeFields / totalFields) * 10);
}

/**
 * Count complete (non-empty) fields in lead data
 */
function countCompleteFields(lead) {
  const requiredFields = ['name', 'role', 'company', 'industry', 'location', 'linkedin_bio'];
  return requiredFields.filter(field => 
    lead[field] && 
    typeof lead[field] === 'string' && 
    lead[field].trim().length > 0
  ).length;
}

/**
 * Validate lead data structure
 */
function validateLeadData(lead) {
  const requiredFields = ['name', 'role', 'company', 'industry', 'location', 'linkedin_bio'];
  const errors = [];
  
  for (const field of requiredFields) {
    if (!lead.hasOwnProperty(field)) {
      errors.push(`Missing field: ${field}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  calculateRuleScore,
  calculateRoleScore,
  calculateIndustryScore,
  calculateCompletenessScore,
  validateLeadData,
  RULE_SCORES
};