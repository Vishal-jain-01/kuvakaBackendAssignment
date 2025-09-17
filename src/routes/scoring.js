/**
 * Routes for lead scoring and results
 * POST /api/score - Run scoring pipeline
 * GET /api/results - Return scored results
 * GET /api/results/export - Export results as CSV
 */

const express = require('express');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');
const dataStore = require('../utils/dataStore');
const { calculateRuleScore } = require('../utils/ruleEngine');
const aiScorer = require('../utils/aiScorer');

const router = express.Router();

/**
 * POST /api/score
 * Run the complete scoring pipeline on uploaded leads
 */
router.post('/score', async (req, res) => {
  try {
    // Check if we have both offer and leads data
    const currentOffer = dataStore.getCurrentOffer();
    const currentLeads = dataStore.getCurrentLeads();

    if (!currentOffer) {
      return res.status(400).json({
        success: false,
        error: 'No offer data available',
        message: 'Please upload an offer using POST /api/offer first'
      });
    }

    if (!currentLeads) {
      return res.status(400).json({
        success: false,
        error: 'No leads data available',
        message: 'Please upload leads using POST /api/leads/upload first'
      });
    }

    console.log(`🎯 Starting scoring pipeline for ${currentLeads.count} leads...`);

    const scoredLeads = [];
    const errors = [];

    // Process each lead through the scoring pipeline
    for (let i = 0; i < currentLeads.data.length; i++) {
      const lead = currentLeads.data[i];
      
      try {
        console.log(`Processing lead ${i + 1}/${currentLeads.data.length}: ${lead.name}`);

        // Step 1: Calculate rule-based score (max 50 points)
        const ruleScore = calculateRuleScore(lead, currentOffer);

        // Step 2: Get AI-based score (max 50 points)
        const aiScore = await aiScorer.scoreLeadWithAI(lead, currentOffer);

        // Step 3: Calculate final score
        const finalScore = Math.min(ruleScore.total + aiScore.aiPoints, 100);

        // Step 4: Determine final intent level based on total score
        let finalIntent = 'Low';
        if (finalScore >= 70) {
          finalIntent = 'High';
        } else if (finalScore >= 40) {
          finalIntent = 'Medium';
        }

        // Create comprehensive reasoning
        const reasoning = buildReasoning(ruleScore, aiScore, finalScore);

        const scoredLead = {
          name: lead.name,
          role: lead.role,
          company: lead.company,
          industry: lead.industry,
          location: lead.location,
          linkedin_bio: lead.linkedin_bio,
          intent: finalIntent,
          score: finalScore,
          reasoning: reasoning,
          breakdown: {
            rule_score: ruleScore.total,
            ai_score: aiScore.aiPoints,
            final_score: finalScore
          },
          details: {
            rule_breakdown: ruleScore.details,
            ai_source: aiScore.source,
            ai_reasoning: aiScore.reasoning
          }
        };

        scoredLeads.push(scoredLead);

      } catch (error) {
        console.error(`Error scoring lead ${lead.name}:`, error);
        errors.push({
          lead: lead.name,
          error: error.message
        });

        // Add lead with error status
        scoredLeads.push({
          name: lead.name,
          role: lead.role,
          company: lead.company,
          industry: lead.industry,
          location: lead.location,
          linkedin_bio: lead.linkedin_bio,
          intent: 'Low',
          score: 0,
          reasoning: `Error during scoring: ${error.message}`,
          breakdown: {
            rule_score: 0,
            ai_score: 0,
            final_score: 0
          },
          details: {
            error: true,
            error_message: error.message
          }
        });
      }
    }

    // Store the results
    const results = dataStore.setResults(scoredLeads);

    console.log(`✅ Scoring completed for ${scoredLeads.length} leads`);

    // Calculate summary statistics
    const summary = calculateSummaryStats(scoredLeads);

    res.json({
      success: true,
      message: 'Lead scoring completed successfully',
      data: {
        results_id: results.id,
        total_leads: scoredLeads.length,
        scored_at: results.scoredAt,
        summary: summary,
        preview: scoredLeads.slice(0, 3) // Show first 3 results as preview
      },
      processing: {
        errors_count: errors.length,
        errors: errors.length > 0 ? errors.slice(0, 5) : [] // Show first 5 errors
      },
      next_steps: {
        view_results: 'GET /api/results',
        export_csv: 'GET /api/results/export'
      }
    });

  } catch (error) {
    console.error('Error in scoring pipeline:', error);
    res.status(500).json({
      success: false,
      error: 'Scoring pipeline failed',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

/**
 * GET /api/results
 * Return the latest scored results
 */
router.get('/results', (req, res) => {
  try {
    const results = dataStore.getLatestResults();
    
    if (!results) {
      return res.status(404).json({
        success: false,
        error: 'No results available',
        message: 'Please run scoring using POST /api/score first'
      });
    }

    const summary = calculateSummaryStats(results.data);

    res.json({
      success: true,
      data: results.data,
      meta: {
        results_id: results.id,
        total_leads: results.count,
        scored_at: results.scoredAt,
        summary: summary
      }
    });

  } catch (error) {
    console.error('Error retrieving results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve results'
    });
  }
});

/**
 * GET /api/results/export
 * Export results as CSV file (Bonus feature)
 */
router.get('/results/export', async (req, res) => {
  try {
    const results = dataStore.getLatestResults();
    
    if (!results) {
      return res.status(404).json({
        success: false,
        error: 'No results available to export',
        message: 'Please run scoring using POST /api/score first'
      });
    }

    // Create CSV file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `lead_scores_${timestamp}.csv`;
    const filepath = path.join(__dirname, '../../uploads', filename);

    // Ensure uploads directory exists
    const uploadDir = path.dirname(filepath);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'name', title: 'Name' },
        { id: 'role', title: 'Role' },
        { id: 'company', title: 'Company' },
        { id: 'industry', title: 'Industry' },
        { id: 'location', title: 'Location' },
        { id: 'intent', title: 'Intent' },
        { id: 'score', title: 'Score' },
        { id: 'rule_score', title: 'Rule Score' },
        { id: 'ai_score', title: 'AI Score' },
        { id: 'reasoning', title: 'Reasoning' }
      ]
    });

    // Prepare data for CSV export
    const csvData = results.data.map(lead => ({
      name: lead.name,
      role: lead.role,
      company: lead.company,
      industry: lead.industry,
      location: lead.location,
      intent: lead.intent,
      score: lead.score,
      rule_score: lead.breakdown?.rule_score || 0,
      ai_score: lead.breakdown?.ai_score || 0,
      reasoning: lead.reasoning
    }));

    await csvWriter.writeRecords(csvData);

    console.log(`📋 CSV export created: ${filename}`);

    // Send the file
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Error sending CSV file:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to send CSV file'
        });
      }

      // Clean up the file after sending
      setTimeout(() => {
        fs.unlink(filepath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Error deleting CSV file:', unlinkErr);
          }
        });
      }, 5000); // Delete after 5 seconds
    });

  } catch (error) {
    console.error('Error exporting results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export results as CSV',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

/**
 * Build comprehensive reasoning text
 */
function buildReasoning(ruleScore, aiScore, finalScore) {
  const parts = [];
  
  // Add rule-based reasoning
  if (ruleScore.total > 0) {
    parts.push(`Rule analysis: ${ruleScore.total}/50 points`);
    if (ruleScore.details.length > 0) {
      parts.push(`(${ruleScore.details.join(', ')})`);
    }
  }

  // Add AI reasoning
  if (aiScore.reasoning && aiScore.reasoning !== 'AI analysis completed') {
    parts.push(`AI analysis: ${aiScore.reasoning}`);
  }

  // Add final assessment
  if (finalScore >= 70) {
    parts.push('High buying intent - strong fit and authority.');
  } else if (finalScore >= 40) {
    parts.push('Medium buying intent - some positive indicators.');
  } else {
    parts.push('Low buying intent - limited fit or authority.');
  }

  return parts.join(' ');
}

/**
 * Calculate summary statistics for results
 */
function calculateSummaryStats(scoredLeads) {
  const total = scoredLeads.length;
  const highIntent = scoredLeads.filter(lead => lead.intent === 'High').length;
  const mediumIntent = scoredLeads.filter(lead => lead.intent === 'Medium').length;
  const lowIntent = scoredLeads.filter(lead => lead.intent === 'Low').length;

  const scores = scoredLeads.map(lead => lead.score);
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / total;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  return {
    total_leads: total,
    intent_distribution: {
      high: highIntent,
      medium: mediumIntent,
      low: lowIntent
    },
    intent_percentages: {
      high: ((highIntent / total) * 100).toFixed(1) + '%',
      medium: ((mediumIntent / total) * 100).toFixed(1) + '%',
      low: ((lowIntent / total) * 100).toFixed(1) + '%'
    },
    score_stats: {
      average: Math.round(avgScore),
      maximum: maxScore,
      minimum: minScore
    }
  };
}

module.exports = router;