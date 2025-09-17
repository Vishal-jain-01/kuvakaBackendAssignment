/**
 * AI integration module for lead intent classification
 * Supports Gemini (Google AI) models with fallback options
 */


// Gemini API integration (Google AI)
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIScorer {
  constructor() {
    this.gemini = null;
    this.isConfigured = false;
    this.init();
  }

  init() {
    try {
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
        this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.isConfigured = true;
        console.log('✅ Gemini AI configured successfully');
      } else {
        console.log('⚠️  Gemini API key not configured - using fallback logic');
      }
    } catch (error) {
      console.error('❌ Error initializing Gemini AI:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Score a lead using AI reasoning
   * @param {Object} lead - Lead data
   * @param {Object} offer - Product/offer data
   * @returns {Promise<Object>} AI scoring result
   */
  async scoreLeadWithAI(lead, offer) {
    if (!this.isConfigured) {
      return this.getFallbackScore(lead, offer);
    }

    try {
      const prompt = this.buildPrompt(lead, offer);
      const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(prompt);
      const aiResponse = result.response.text();
      return this.parseAIResponse(aiResponse);
    } catch (error) {
      console.error('Error calling Gemini API:', error.message);
      return this.getFallbackScore(lead, offer);
    }
  }

  /**
   * Build the prompt for AI classification
   */
  buildPrompt(lead, offer) {
    const offerDetails = offer ? `
Product/Offer: ${offer.name}
Value Props: ${offer.value_props ? offer.value_props.join(', ') : 'Not specified'}
Ideal Use Cases: ${offer.ideal_use_cases ? offer.ideal_use_cases.join(', ') : 'Not specified'}
` : 'No product/offer details provided';

    const leadDetails = `
Prospect Profile:
- Name: ${lead.name || 'Not provided'}
- Role: ${lead.role || 'Not provided'}
- Company: ${lead.company || 'Not provided'}
- Industry: ${lead.industry || 'Not provided'}
- Location: ${lead.location || 'Not provided'}
- LinkedIn Bio: ${lead.linkedin_bio || 'Not provided'}
`;

    return `${offerDetails}

${leadDetails}

Based on the prospect's profile and the product offering, classify their buying intent as High, Medium, or Low.

Consider:
- Role authority and decision-making power
- Industry fit with the product
- Company stage and likely needs
- Geographic relevance
- Profile completeness and engagement indicators

Respond in this exact format:
Intent: [High/Medium/Low]
Reasoning: [1-2 sentences explaining your classification]

Example response:
Intent: High
Reasoning: VP of Sales at a mid-market SaaS company fits perfectly with the ICP, has decision-making authority, and the AI automation directly addresses sales productivity challenges.`;
  }

  /**
   * Parse AI response and extract intent/reasoning
   */
  parseAIResponse(aiResponse) {
    if (!aiResponse) {
      return this.getFallbackScore();
    }

    try {
      const lines = aiResponse.trim().split('\n');
      let intent = 'Medium';
      let reasoning = 'AI analysis completed';

      for (const line of lines) {
        if (line.toLowerCase().startsWith('intent:')) {
          const intentMatch = line.match(/intent:\s*(high|medium|low)/i);
          if (intentMatch) {
            intent = intentMatch[1].charAt(0).toUpperCase() + intentMatch[1].slice(1).toLowerCase();
          }
        } else if (line.toLowerCase().startsWith('reasoning:')) {
          reasoning = line.replace(/reasoning:\s*/i, '').trim();
        }
      }

      const aiPoints = this.intentToPoints(intent);

      return {
        intent,
        reasoning,
        aiPoints,
        source: 'gemini'
      };

    } catch (error) {
      console.error('Error parsing AI response:', error.message);
      return this.getFallbackScore();
    }
  }

  /**
   * Convert intent level to points
   */
  intentToPoints(intent) {
    const mapping = {
      'High': 50,
      'Medium': 30,
      'Low': 10
    };
    return mapping[intent] || 30;
  }

  /**
   * Fallback scoring when AI is not available
   */
  getFallbackScore(lead, offer) {
    // Simple heuristic-based scoring as fallback
    let intent = 'Medium';
    let reasoning = 'Fallback analysis: ';
    let score = 30;

    if (!lead) {
      return {
        intent: 'Low',
        reasoning: 'Insufficient lead data for analysis',
        aiPoints: 10,
        source: 'fallback'
      };
    }

    // Basic heuristics for fallback scoring
    const hasDecisionMakerRole = lead.role && 
      ['ceo', 'cto', 'cfo', 'director', 'vp', 'head', 'manager'].some(title => 
        lead.role.toLowerCase().includes(title)
      );

    const hasTechIndustry = lead.industry && 
      ['tech', 'software', 'saas', 'digital'].some(keyword =>
        lead.industry.toLowerCase().includes(keyword)
      );

    const hasCompleteProfile = [lead.name, lead.role, lead.company, lead.industry].every(field => 
      field && field.trim().length > 0
    );

    if (hasDecisionMakerRole && hasTechIndustry && hasCompleteProfile) {
      intent = 'High';
      score = 50;
      reasoning += 'Decision maker in tech industry with complete profile indicates high intent';
    } else if (hasDecisionMakerRole || hasTechIndustry) {
      intent = 'Medium';
      score = 30;
      reasoning += 'Some positive indicators but not all criteria met';
    } else {
      intent = 'Low';
      score = 10;
      reasoning += 'Limited indicators of buying intent or decision-making authority';
    }

    return {
      intent,
      reasoning,
      aiPoints: score,
      source: 'fallback'
    };
  }

  /**
   * Test AI connection
   */
  async testConnection() {
    if (!this.isConfigured) {
      return {
        success: false,
        message: 'Gemini not configured'
      };
    }

    try {
      const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
      await model.generateContent('Hello');
      return {
        success: true,
        message: 'Gemini connection successful',
        model: 'gemini-pro'
      };
    } catch (error) {
      return {
        success: false,
        message: `Gemini connection failed: ${error.message}`
      };
    }
  }

  /**
   * Get configuration status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      provider: this.isConfigured ? 'gemini' : 'fallback',
      model: this.isConfigured ? 'gemini-pro' : 'heuristic-based'
    };
  }
}

// Export singleton instance
const aiScorer = new AIScorer();
module.exports = aiScorer;