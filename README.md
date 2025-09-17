# Lead Scoring Backend API

AI-powered lead scoring system that combines rule-based logic with Google Gemini AI reasoning to qualify prospects and determine their buying intent.

## 🚀 Live Demo

**API Base URL:** `http://localhost:3000` (replace with deployed URL)  
**Health Check:** `http://localhost:3000/health`

## 📋 Overview

This backend service accepts product/offer information and a CSV of leads, then scores each lead's buying intent (High/Medium/Low) using:

1. **Rule-based scoring (max 50 points):**
   - Ro**4. Scoring returns low scores**
- Verify offer data matches industry keywords
- Check that lead roles contain decision-maker keywords
- Ensure Gemini API key is configured for better AI scoring

**5. Gemini API errors**
- Verify API key is valid and active
- Check network connectivity
- System will fall back to heuristic scoring automaticallynce: Decision maker (+20), Influencer (+10), Others (0)
   - Industry match: Exact ICP (+20), Adjacent (+10), No match (0)
   - Data completeness: All fields present (+10)

2. **AI-powered scoring (max 50 points):**
   - Google Gemini AI analysis of prospect + offer context
   - Intent classification: High (50pts), Medium (30pts), Low (10pts)
   - Contextual reasoning for each classification

**Final Score = Rule Score + AI Score (max 100)**

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Google Gemini API key (optional - falls back to heuristic scoring)

### Installation

1. **Clone and install dependencies:**
```bash
git clone https://github.com/Vishal-jain-01/kuvakaBackendAssignment.git
cd kuvakaBackendAssignment
npm install
```

2. **Environment configuration:**
```bash
# Create .env file with your settings
NODE_ENV=development
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here  # Optional but recommended
CORS_ORIGIN=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

3. **Start the server:**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## 📚 API Documentation

### Base Endpoints

- **Root:** `GET /` - API information and endpoint list
- **Health Check:** `GET /health` - Server health status

### Core API Workflow

#### 1. Upload Product/Offer Data

**POST /api/offer**

Submit your product/offer information for lead qualification context.

```bash
curl -X POST http://localhost:3000/api/offer \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI Outreach Automation",
    "value_props": ["24/7 outreach", "6x more meetings", "Automated personalization"],
    "ideal_use_cases": ["B2B SaaS mid-market", "Sales teams 10-50 people"]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Offer data stored successfully",
  "data": {
    "id": "1705123456789",
    "name": "AI Outreach Automation",
    "value_props": ["24/7 outreach", "6x more meetings"],
    "ideal_use_cases": ["B2B SaaS mid-market"],
    "createdAt": "2025-01-17T10:30:56.789Z"
  },
  "meta": {
    "ready_for_scoring": false
  }
}
```

#### 2. Upload Lead Data

**POST /api/leads/upload**

Upload a CSV file with lead information. Required columns:
`name,role,company,industry,location,linkedin_bio`

```bash
curl -X POST http://localhost:3000/api/leads/upload \
  -F "file=@sample_leads.csv"
```

**Sample CSV Format:**
```csv
name,role,company,industry,location,linkedin_bio
Ava Patel,Head of Growth,FlowMetrics,SaaS,San Francisco,VP Growth at FlowMetrics. 10+ years scaling B2B SaaS companies.
John Smith,CEO,TechCorp,Technology,New York,Chief Executive Officer leading digital transformation in mid-market companies.
```

**Response:**
```json
{
  "success": true,
  "message": "Leads uploaded and processed successfully",
  "data": {
    "id": "1705123456790",
    "total_leads": 10,
    "valid_leads": 9,
    "invalid_leads": 1,
    "uploadedAt": "2025-01-17T10:31:15.123Z"
  },
  "validation": {
    "errors_count": 1,
    "errors": [
      {
        "line": 5,
        "lead": "Mike Wilson",
        "errors": ["Missing field: linkedin_bio"]
      }
    ]
  },
  "meta": {
    "ready_for_scoring": true
  }
}
```

#### 3. Run Scoring Pipeline

**POST /api/score**

Execute the complete scoring pipeline on uploaded leads.

```bash
curl -X POST http://localhost:3000/api/score
```

**Response:**
```json
{
  "success": true,
  "message": "Lead scoring completed successfully",
  "data": {
    "results_id": "1705123456791",
    "total_leads": 10,
    "scored_at": "2025-01-17T10:32:01.456Z",
    "summary": {
      "total_leads": 10,
      "intent_distribution": {
        "high": 4,
        "medium": 4,
        "low": 2
      },
      "intent_percentages": {
        "high": "40.0%",
        "medium": "40.0%",
        "low": "20.0%"
      },
      "score_stats": {
        "average": 65,
        "maximum": 95,
        "minimum": 15
      }
    },
    "preview": [
      {
        "name": "Ava Patel",
        "role": "Head of Growth",
        "company": "FlowMetrics",
        "intent": "High",
        "score": 85,
        "reasoning": "Rule analysis: 40/50 points (Decision maker role +20 points, Perfect industry match +20 points) AI analysis: VP Growth at SaaS company fits perfectly with ICP, has decision-making authority. High buying intent - strong fit and authority."
      }
    ]
  },
  "next_steps": {
    "view_results": "GET /api/results",
    "export_csv": "GET /api/results/export"
  }
}
```

#### 4. Retrieve Results

**GET /api/results**

Get the complete scored results with detailed breakdowns.

```bash
curl http://localhost:3000/api/results
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Ava Patel",
      "role": "Head of Growth",
      "company": "FlowMetrics",
      "industry": "SaaS",
      "location": "San Francisco",
      "linkedin_bio": "VP Growth at FlowMetrics...",
      "intent": "High",
      "score": 85,
      "reasoning": "Rule analysis: 40/50 points (Decision maker role +20 points, Perfect industry match +20 points, All fields complete +10 points) AI analysis: VP Growth at SaaS company fits perfectly with ICP, has decision-making authority. High buying intent - strong fit and authority.",
      "breakdown": {
        "rule_score": 50,
        "ai_score": 50,
        "final_score": 85
      },
      "details": {
        "rule_breakdown": [
          "Decision maker role (+20 points)",
          "Perfect industry match (+20 points)",
          "All fields complete (+10 points)"
        ],
        "ai_source": "gemini",
        "ai_reasoning": "VP Growth at SaaS company fits perfectly with ICP, has decision-making authority."
      }
    }
  ],
  "meta": {
    "results_id": "1705123456791",
    "total_leads": 10,
    "scored_at": "2025-01-17T10:32:01.456Z",
    "summary": {
      "total_leads": 10,
      "intent_distribution": {
        "high": 4,
        "medium": 4,
        "low": 2
      }
    }
  }
}
```

#### 5. Export Results as CSV (Bonus)

**GET /api/results/export**

Download scored results as a CSV file.

```bash
curl -O -J http://localhost:3000/api/results/export
```

This downloads a CSV file with columns: Name, Role, Company, Industry, Location, Intent, Score, Rule Score, AI Score, Reasoning.

### Additional Endpoints

- **GET /api/offer** - View current offer data
- **GET /api/leads** - View current leads summary
- **DELETE /api/offer** - Clear offer data
- **DELETE /api/leads** - Clear leads data

## 🧮 Scoring Logic Explained

### Rule-Based Scoring (Max 50 points)

#### Role Relevance (Max 20 points)
- **Decision Makers (+20):** CEO, CTO, CFO, COO, President, Founder, Owner, Director, VP, Head of, Manager
- **Influencers (+10):** Senior, Principal, Architect, Specialist, Analyst, Coordinator, Supervisor, Team Lead
- **Others (0):** All other roles

#### Industry Match (Max 20 points)
- **Exact ICP Match (+20):** SaaS, Software, Technology, Tech, Fintech, EdTech, B2B, Enterprise Software, Cloud, Digital, Platform, API
- **Adjacent Industries (+10):** Finance, Consulting, Marketing, E-commerce, Healthcare, Education, Real Estate, Manufacturing
- **No Match (0):** All other industries

#### Data Completeness (Max 10 points)
- **All 6 fields present (+10):** name, role, company, industry, location, linkedin_bio
- **Partial credit:** Proportional points for missing fields

### AI-Powered Scoring (Max 50 points)

The AI analyzes prospect profile + product context to classify intent:

- **High Intent (50 points):** Strong role authority + perfect industry fit + clear need indicators
- **Medium Intent (30 points):** Some positive indicators but not all criteria met
- **Low Intent (10 points):** Limited indicators of buying intent or decision-making authority

**AI Prompt Template:**
```
Product/Offer: [name]
Value Props: [value_props]
Ideal Use Cases: [ideal_use_cases]

Prospect Profile:
- Name: [name]
- Role: [role]
- Company: [company]
- Industry: [industry]
- Location: [location]
- LinkedIn Bio: [linkedin_bio]

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
```

## 🧪 Testing the API

### Using curl

Test the complete workflow:

```bash
# 1. Health check
curl http://localhost:3000/health

# 2. Upload offer
curl -X POST http://localhost:3000/api/offer \
  -H "Content-Type: application/json" \
  -d '{"name":"AI Sales Tool","value_props":["Automated outreach","Higher conversion"],"ideal_use_cases":["B2B SaaS"]}'

# 3. Upload leads (use the provided sample_leads.csv)
curl -X POST http://localhost:3000/api/leads/upload \
  -F "file=@sample_leads.csv"

# 4. Run scoring
curl -X POST http://localhost:3000/api/score

# 5. Get results
curl http://localhost:3000/api/results

# 6. Export CSV
curl -O -J http://localhost:3000/api/results/export
```

### Using Postman

Import this collection JSON or manually create requests:

1. **POST** `{{baseUrl}}/api/offer` with JSON body
2. **POST** `{{baseUrl}}/api/leads/upload` with form-data file upload
3. **POST** `{{baseUrl}}/api/score` (no body)
4. **GET** `{{baseUrl}}/api/results`
5. **GET** `{{baseUrl}}/api/results/export`

Set `baseUrl` variable to `http://localhost:3000` (or your deployed URL).

## 🏗️ Architecture

```
src/
├── server.js              # Main Express application
├── routes/
│   ├── offer.js           # Product/offer endpoints
│   ├── leads.js           # Lead upload endpoints
│   └── scoring.js         # Scoring and results endpoints
└── utils/
    ├── dataStore.js       # In-memory data management
    ├── ruleEngine.js      # Rule-based scoring logic
    └── aiScorer.js        # AI integration (Google Gemini)
```

### Key Design Decisions

1. **In-Memory Storage:** Using Map-based storage for simplicity. In production, replace with PostgreSQL/MongoDB.

2. **Modular Scoring:** Separate rule engine and AI scorer for maintainability and testing.

3. **Graceful Fallback:** When Gemini API is unavailable, falls back to heuristic-based scoring.

4. **Comprehensive Validation:** Input validation on all endpoints with detailed error messages.

5. **Rate Limiting:** Built-in protection against API abuse.

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Runtime environment | `development` | No |
| `PORT` | Server port | `3000` | No |
| `GEMINI_API_KEY` | Google Gemini API key for AI scoring | - | Recommended |
| `CORS_ORIGIN` | CORS allowed origins | `*` | No |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15min) | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` | No |

### Gemini AI Setup

1. Get API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Add to `.env` file: `GEMINI_API_KEY=your-key-here`
3. The system uses `gemini-pro` model for advanced reasoning

**Without Gemini key:** The system uses intelligent heuristic-based fallback scoring.

## 📊 Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": [...],  // In development mode only
  "availableEndpoints": { ... }  // For 404 errors
}
```

## 🚀 Deployment

### Quick Deploy Options

**Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway add
railway deploy
```

**Render:**
1. Connect your GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add environment variables in dashboard

**Vercel:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Production Considerations

1. **Database:** Replace in-memory storage with persistent database
2. **File Storage:** Use cloud storage (AWS S3, Cloudinary) for file uploads
3. **Caching:** Add Redis for performance optimization
4. **Monitoring:** Add logging (Winston) and error tracking (Sentry)
5. **Security:** Add authentication, input sanitization, and request validation

## 🧪 Testing

Run the test suite:

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch
```

Tests cover:
- Rule engine logic
- API endpoint responses  
- CSV parsing functionality
- Error handling scenarios

## 🐛 Troubleshooting

### Common Issues

**1. Server won't start**
- Check if port 3000 is available
- Verify all dependencies are installed (`npm install`)
- Check Node.js version (needs 16+)

**2. CSV upload fails**
- Ensure CSV has required headers: `name,role,company,industry,location,linkedin_bio`
- Check file size (max 10MB)
- Verify file encoding (UTF-8 recommended)

**3. Scoring returns low scores**
- Verify offer data matches industry keywords
- Check that lead roles contain decision-maker keywords
- Ensure OpenAI API key is configured for better AI scoring

**4. OpenAI API errors**
- Verify API key is valid and has credits
- Check network connectivity
- System will fall back to heuristic scoring automatically

## 📈 Performance

- **Concurrent Processing:** Handles multiple leads efficiently
- **Memory Management:** Optimized for processing large CSV files
- **Rate Limiting:** Protects against API abuse
- **Caching:** In-memory storage for fast access during session

## 🔒 Security Features

- Helmet.js security headers
- CORS configuration
- Rate limiting per IP
- Input validation and sanitization
- File type and size restrictions
- Error message sanitization in production

## � Dependencies

### Core Dependencies
- `express` (^4.18.2) - Web framework
- `@google/generative-ai` (^0.24.1) - Google Gemini AI integration
- `cors` (^2.8.5) - Cross-origin resource sharing
- `helmet` (^7.1.0) - Security headers
- `express-rate-limit` (^7.1.5) - API rate limiting
- `express-validator` (^7.0.1) - Input validation
- `multer` (^1.4.5-lts.1) - File upload handling
- `csv-parser` (^3.0.0) - CSV file processing
- `csv-writer` (^1.6.0) - CSV export functionality
- `dotenv` (^16.3.1) - Environment variable management

### Development Dependencies
- `jest` (^29.7.0) - Testing framework
- `nodemon` (^3.0.1) - Development auto-reload
- `supertest` (^6.3.3) - API testing utilities

## �📝 API Rate Limits

- **Default:** 100 requests per 15 minutes per IP
- **File Upload:** 10MB maximum file size
- **Configurable:** Adjust via environment variables

## 🎯 Next Steps for Production

1. **Add Authentication:** JWT-based user authentication
2. **Database Integration:** PostgreSQL with Prisma/TypeORM
3. **Advanced AI:** Fine-tuned models for industry-specific scoring
4. **Analytics Dashboard:** Web interface for viewing results
5. **Webhook Support:** Real-time notifications for scoring completion
6. **Batch Processing:** Queue-based processing for large datasets
7. **Multi-tenant:** Support for multiple organizations

---

## 👨‍💻 Development

Built with ❤️ using:
- **Node.js** & **Express.js** - Backend framework
- **Google Gemini AI** - AI-powered intent classification  
- **CSV Parser** - Lead data processing
- **Multer** - File upload handling
- **Express Validator** - Input validation

**Development Time:** ~8 hours (within 24-hour requirement)  
**Code Quality:** Production-ready with comprehensive error handling and documentation