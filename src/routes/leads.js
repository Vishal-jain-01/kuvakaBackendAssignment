/**
 * Routes for handling lead data upload
 * POST /api/leads/upload - Accept CSV file with lead data
 */

const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const dataStore = require('../utils/dataStore');
const { validateLeadData } = require('../utils/ruleEngine');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueName = `leads_${Date.now()}_${Math.round(Math.random() * 1E9)}.csv`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Only accept CSV files
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

/**
 * POST /api/leads/upload
 * Accept CSV file with lead data
 * 
 * Expected CSV columns: name,role,company,industry,location,linkedin_bio
 */
router.post('/leads/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please upload a CSV file with lead data'
      });
    }

    console.log(`📄 Processing uploaded file: ${req.file.originalname}`);

    // Parse the CSV file
    const leads = [];
    const errors = [];
    let lineNumber = 1; // Start from 1 (header is line 1)

    return new Promise((resolve) => {
      fs.createReadStream(req.file.path)
        .pipe(csv({
          // Map headers to expected field names (case-insensitive)
          mapHeaders: ({ header }) => header.toLowerCase().trim(),
          // Skip empty lines
          skipEmptyLines: true
        }))
        .on('data', (row) => {
          lineNumber++;
          
          // Clean and validate the row data
          const lead = {
            name: (row.name || '').toString().trim(),
            role: (row.role || '').toString().trim(),
            company: (row.company || '').toString().trim(),
            industry: (row.industry || '').toString().trim(),
            location: (row.location || '').toString().trim(),
            linkedin_bio: (row.linkedin_bio || '').toString().trim()
          };

          // Validate lead data structure
          const validation = validateLeadData(lead);
          if (!validation.isValid) {
            errors.push({
              line: lineNumber,
              lead: lead.name || `Line ${lineNumber}`,
              errors: validation.errors
            });
          }

          // Add lead even if validation failed (we'll flag incomplete data)
          leads.push({
            ...lead,
            lineNumber,
            isValid: validation.isValid
          });
        })
        .on('end', () => {
          // Clean up the uploaded file
          fs.unlink(req.file.path, (unlinkError) => {
            if (unlinkError) {
              console.error('Error deleting temp file:', unlinkError);
            }
          });

          if (leads.length === 0) {
            return resolve(res.status(400).json({
              success: false,
              error: 'No valid lead data found',
              message: 'The CSV file appears to be empty or incorrectly formatted'
            }));
          }

          // Store the leads
          const leadsData = dataStore.setLeads(leads);

          console.log(`✅ Processed ${leads.length} leads from CSV`);
          if (errors.length > 0) {
            console.log(`⚠️  Found ${errors.length} validation warnings`);
          }

          resolve(res.status(201).json({
            success: true,
            message: 'Leads uploaded and processed successfully',
            data: {
              id: leadsData.id,
              total_leads: leads.length,
              valid_leads: leads.filter(lead => lead.isValid).length,
              invalid_leads: leads.filter(lead => !lead.isValid).length,
              uploadedAt: leadsData.uploadedAt
            },
            validation: {
              errors_count: errors.length,
              errors: errors.length > 0 ? errors.slice(0, 10) : [], // Show first 10 errors
              has_more_errors: errors.length > 10
            },
            meta: {
              ready_for_scoring: !!dataStore.getCurrentOffer()
            }
          }));
        })
        .on('error', (error) => {
          console.error('Error parsing CSV:', error);
          
          // Clean up the uploaded file
          fs.unlink(req.file.path, (unlinkError) => {
            if (unlinkError) {
              console.error('Error deleting temp file:', unlinkError);
            }
          });

          resolve(res.status(400).json({
            success: false,
            error: 'Failed to parse CSV file',
            message: 'Please ensure the CSV file is properly formatted with headers: name,role,company,industry,location,linkedin_bio',
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
          }));
        });
    });

  } catch (error) {
    console.error('Error processing leads upload:', error);
    
    // Clean up the uploaded file if it exists
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (unlinkError) => {
        if (unlinkError) {
          console.error('Error deleting temp file:', unlinkError);
        }
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process leads upload',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

/**
 * GET /api/leads
 * Retrieve current leads data (summary)
 */
router.get('/leads', (req, res) => {
  try {
    const currentLeads = dataStore.getCurrentLeads();
    
    if (!currentLeads) {
      return res.status(404).json({
        success: false,
        error: 'No leads data found',
        message: 'Please upload leads using POST /api/leads/upload first'
      });
    }

    const validLeads = currentLeads.data.filter(lead => lead.isValid);
    const invalidLeads = currentLeads.data.filter(lead => !lead.isValid);

    res.json({
      success: true,
      data: {
        id: currentLeads.id,
        total_leads: currentLeads.count,
        valid_leads: validLeads.length,
        invalid_leads: invalidLeads.length,
        uploadedAt: currentLeads.uploadedAt,
        sample_leads: currentLeads.data.slice(0, 3).map(lead => ({
          name: lead.name,
          role: lead.role,
          company: lead.company,
          industry: lead.industry,
          isValid: lead.isValid
        }))
      },
      meta: {
        ready_for_scoring: !!dataStore.getCurrentOffer()
      }
    });

  } catch (error) {
    console.error('Error retrieving leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve leads data'
    });
  }
});

/**
 * DELETE /api/leads
 * Clear current leads data
 */
router.delete('/leads', (req, res) => {
  try {
    dataStore.clearLeads();
    
    res.json({
      success: true,
      message: 'Leads data cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear leads data'
    });
  }
});

module.exports = router;