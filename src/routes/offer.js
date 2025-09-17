/**
 * Routes for handling product/offer data
 * POST /api/offer - Accept product/offer details
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const dataStore = require('../utils/dataStore');

const router = express.Router();

/**
 * POST /api/offer
 * Accept JSON with product/offer details
 * 
 * Example payload:
 * {
 *   "name": "AI Outreach Automation",
 *   "value_props": ["24/7 outreach", "6x more meetings"],
 *   "ideal_use_cases": ["B2B SaaS mid-market"]
 * }
 */
router.post('/offer', [
  // Validation middleware
  body('name')
    .notEmpty()
    .withMessage('Product/offer name is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Name must be between 1 and 200 characters'),
  
  body('value_props')
    .optional()
    .isArray()
    .withMessage('Value props must be an array')
    .custom((value) => {
      if (value && value.length > 0) {
        const allStrings = value.every(prop => typeof prop === 'string' && prop.trim().length > 0);
        if (!allStrings) {
          throw new Error('All value propositions must be non-empty strings');
        }
      }
      return true;
    }),
  
  body('ideal_use_cases')
    .optional()
    .isArray()
    .withMessage('Ideal use cases must be an array')
    .custom((value) => {
      if (value && value.length > 0) {
        const allStrings = value.every(useCase => typeof useCase === 'string' && useCase.trim().length > 0);
        if (!allStrings) {
          throw new Error('All ideal use cases must be non-empty strings');
        }
      }
      return true;
    })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, value_props, ideal_use_cases } = req.body;

    // Store the offer data
    const offer = dataStore.setOffer({
      name: name.trim(),
      value_props: value_props || [],
      ideal_use_cases: ideal_use_cases || []
    });

    // Log for debugging
    console.log(`📝 New offer stored: ${offer.name} (ID: ${offer.id})`);

    res.status(201).json({
      success: true,
      message: 'Offer data stored successfully',
      data: {
        id: offer.id,
        name: offer.name,
        value_props: offer.value_props,
        ideal_use_cases: offer.ideal_use_cases,
        createdAt: offer.createdAt
      },
      meta: {
        ready_for_scoring: !!dataStore.getCurrentLeads()
      }
    });

  } catch (error) {
    console.error('Error storing offer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store offer data',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

/**
 * GET /api/offer
 * Retrieve current offer data
 */
router.get('/offer', (req, res) => {
  try {
    const currentOffer = dataStore.getCurrentOffer();
    
    if (!currentOffer) {
      return res.status(404).json({
        success: false,
        error: 'No offer data found',
        message: 'Please upload an offer using POST /api/offer first'
      });
    }

    res.json({
      success: true,
      data: {
        id: currentOffer.id,
        name: currentOffer.name,
        value_props: currentOffer.value_props,
        ideal_use_cases: currentOffer.ideal_use_cases,
        createdAt: currentOffer.createdAt
      },
      meta: {
        ready_for_scoring: !!dataStore.getCurrentLeads()
      }
    });

  } catch (error) {
    console.error('Error retrieving offer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve offer data'
    });
  }
});

/**
 * DELETE /api/offer
 * Clear current offer data
 */
router.delete('/offer', (req, res) => {
  try {
    dataStore.clearOffers();
    
    res.json({
      success: true,
      message: 'Offer data cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing offers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear offer data'
    });
  }
});

module.exports = router;