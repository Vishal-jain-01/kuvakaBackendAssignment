/**
 * Unit tests for the rule engine
 * Tests the rule-based scoring logic
 */

const {
  calculateRuleScore,
  calculateRoleScore,
  calculateIndustryScore,
  calculateCompletenessScore,
  validateLeadData,
  RULE_SCORES
} = require('../src/utils/ruleEngine');

describe('Rule Engine', () => {
  // Sample test data
  const sampleOffer = {
    name: "AI Outreach Automation",
    value_props: ["24/7 outreach", "6x more meetings"],
    ideal_use_cases: ["B2B SaaS mid-market"]
  };

  const sampleLead = {
    name: "John Smith",
    role: "CEO",
    company: "TechCorp",
    industry: "SaaS",
    location: "New York",
    linkedin_bio: "Chief Executive Officer leading digital transformation"
  };

  describe('calculateRoleScore', () => {
    test('should return 20 points for decision maker roles', () => {
      expect(calculateRoleScore('CEO')).toBe(20);
      expect(calculateRoleScore('CTO')).toBe(20);
      expect(calculateRoleScore('Director of Sales')).toBe(20);
      expect(calculateRoleScore('VP Marketing')).toBe(20);
      expect(calculateRoleScore('Head of Growth')).toBe(20);
    });

    test('should return 10 points for influencer roles', () => {
      expect(calculateRoleScore('Senior Developer')).toBe(10);
      expect(calculateRoleScore('Principal Engineer')).toBe(10);
      expect(calculateRoleScore('Team Lead')).toBe(10);
      expect(calculateRoleScore('Product Manager')).toBe(10);
    });

    test('should return 0 points for non-decision maker roles', () => {
      expect(calculateRoleScore('Junior Developer')).toBe(0);
      expect(calculateRoleScore('Intern')).toBe(0);
      expect(calculateRoleScore('Assistant')).toBe(0);
    });

    test('should handle null/undefined roles', () => {
      expect(calculateRoleScore(null)).toBe(0);
      expect(calculateRoleScore(undefined)).toBe(0);
      expect(calculateRoleScore('')).toBe(0);
    });

    test('should be case insensitive', () => {
      expect(calculateRoleScore('ceo')).toBe(20);
      expect(calculateRoleScore('DIRECTOR')).toBe(20);
      expect(calculateRoleScore('Senior developer')).toBe(10);
    });
  });

  describe('calculateIndustryScore', () => {
    test('should return 20 points for exact ICP match', () => {
      expect(calculateIndustryScore('SaaS', sampleOffer)).toBe(20);
      expect(calculateIndustryScore('Software', sampleOffer)).toBe(20);
      expect(calculateIndustryScore('Technology', sampleOffer)).toBe(20);
      expect(calculateIndustryScore('B2B SaaS', sampleOffer)).toBe(20);
    });

    test('should return 10 points for adjacent industries', () => {
      expect(calculateIndustryScore('Finance', sampleOffer)).toBe(10);
      expect(calculateIndustryScore('Consulting', sampleOffer)).toBe(10);
      expect(calculateIndustryScore('Healthcare', sampleOffer)).toBe(10);
    });

    test('should return 0 points for non-matching industries', () => {
      expect(calculateIndustryScore('Agriculture', sampleOffer)).toBe(0);
      expect(calculateIndustryScore('Mining', sampleOffer)).toBe(0);
    });

    test('should handle null/undefined industry', () => {
      expect(calculateIndustryScore(null, sampleOffer)).toBe(0);
      expect(calculateIndustryScore(undefined, sampleOffer)).toBe(0);
      expect(calculateIndustryScore('', sampleOffer)).toBe(0);
    });

    test('should match against offer ideal_use_cases', () => {
      const offerWithUseCase = {
        ...sampleOffer,
        ideal_use_cases: ['Fintech', 'Healthcare Tech']
      };
      expect(calculateIndustryScore('Fintech Solutions', offerWithUseCase)).toBe(20);
    });
  });

  describe('calculateCompletenessScore', () => {
    test('should return 10 points for complete lead data', () => {
      expect(calculateCompletenessScore(sampleLead)).toBe(10);
    });

    test('should return partial points for incomplete data', () => {
      const incompleteLead = {
        name: "John Smith",
        role: "CEO",
        company: "TechCorp",
        industry: "", // missing
        location: "", // missing
        linkedin_bio: "CEO description"
      };
      // 4 complete fields out of 6 = 6 points (rounded down)
      expect(calculateCompletenessScore(incompleteLead)).toBe(6);
    });

    test('should return 0 points for empty lead', () => {
      const emptyLead = {
        name: "",
        role: "",
        company: "",
        industry: "",
        location: "",
        linkedin_bio: ""
      };
      expect(calculateCompletenessScore(emptyLead)).toBe(0);
    });
  });

  describe('calculateRuleScore', () => {
    test('should calculate total score correctly for high-scoring lead', () => {
      const result = calculateRuleScore(sampleLead, sampleOffer);
      
      expect(result.total).toBe(50); // 20 (role) + 20 (industry) + 10 (completeness)
      expect(result.roleScore).toBe(20);
      expect(result.industryScore).toBe(20);
      expect(result.completenessScore).toBe(10);
      expect(result.details).toHaveLength(3);
    });

    test('should calculate partial scores correctly', () => {
      const partialLead = {
        name: "Jane Doe",
        role: "Developer", // 0 points
        company: "TechCorp",
        industry: "Finance", // 10 points (adjacent)
        location: "", // incomplete
        linkedin_bio: "Software developer"
      };

      const result = calculateRuleScore(partialLead, sampleOffer);
      
      expect(result.roleScore).toBe(0);
      expect(result.industryScore).toBe(10);
      expect(result.completenessScore).toBe(8); // 5/6 fields complete
      expect(result.total).toBe(18);
    });

    test('should cap score at 50 points maximum', () => {
      // This test ensures the cap works, though with current logic it's not needed
      const result = calculateRuleScore(sampleLead, sampleOffer);
      expect(result.total).toBeLessThanOrEqual(50);
    });
  });

  describe('validateLeadData', () => {
    test('should validate complete lead data', () => {
      const result = validateLeadData(sampleLead);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should identify missing fields', () => {
      const incompleteLead = {
        name: "John Smith",
        role: "CEO",
        // missing company, industry, location, linkedin_bio
      };

      const result = validateLeadData(incompleteLead);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
      expect(result.errors).toContain('Missing field: company');
      expect(result.errors).toContain('Missing field: industry');
    });

    test('should handle completely empty lead', () => {
      const result = validateLeadData({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(6);
    });
  });

  describe('RULE_SCORES constants', () => {
    test('should have decision maker roles defined', () => {
      expect(RULE_SCORES.DECISION_MAKER_ROLES).toContain('ceo');
      expect(RULE_SCORES.DECISION_MAKER_ROLES).toContain('cto');
      expect(RULE_SCORES.DECISION_MAKER_ROLES).toContain('director');
    });

    test('should have influencer roles defined', () => {
      expect(RULE_SCORES.INFLUENCER_ROLES).toContain('senior');
      expect(RULE_SCORES.INFLUENCER_ROLES).toContain('principal');
      expect(RULE_SCORES.INFLUENCER_ROLES).toContain('manager');
    });

    test('should have ICP industries defined', () => {
      expect(RULE_SCORES.ICP_INDUSTRIES).toContain('saas');
      expect(RULE_SCORES.ICP_INDUSTRIES).toContain('software');
      expect(RULE_SCORES.ICP_INDUSTRIES).toContain('b2b');
    });
  });
});