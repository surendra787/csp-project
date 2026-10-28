import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface AggregateFindingInput {
  category: string;
  concern: string;
  count: number;
  percentage: number;
  villagesAffected: string[];
  priorityScore: number;
  priorityLevel: string;
}

interface AggregateAnalysisPayload {
  totalResponses: number;
  villagesCount: number;
  villagesList: string[];
  dateRange: string;
  categoryBreakdown: Array<{
    category: string;
    totalAnswered: number;
    concernCount: number;
    satisfactoryCount: number;
    concernRate: number;
  }>;
  topFindings: AggregateFindingInput[];
  isDemoDataset: boolean;
}

function hasConfiguredApiKey(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.length > 10);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      aiConfigured: hasConfiguredApiKey(),
    });
  });

  app.post('/api/ai/recommendations', async (req: Request, res: Response) => {
    if (!hasConfiguredApiKey()) {
      res.status(503).json({
        available: false,
        reason: 'GEMINI_API_KEY is not configured in environment variables. Using deterministic local evidence-based analysis.',
      });
      return;
    }

    try {
      const payload = req.body as AggregateAnalysisPayload;
      if (!payload || typeof payload.totalResponses !== 'number' || !Array.isArray(payload.topFindings)) {
        res.status(400).json({
          available: false,
          reason: 'Invalid anonymized survey aggregate payload.',
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Strict privacy guard: build prompt exclusively from numeric aggregates & category/village counts
      const sanitizedSummary = {
        datasetType: payload.isDemoDataset ? 'Demo Preview Dataset' : 'Uploaded Household Survey Dataset',
        totalHouseholdResponses: payload.totalResponses,
        villagesCoveredCount: payload.villagesCount,
        villagesCovered: (payload.villagesList || []).slice(0, 20),
        surveyDateSpan: payload.dateRange || 'Not specified',
        categoryStatistics: (payload.categoryBreakdown || []).map((c) => ({
          category: c.category,
          answeredHouseholds: c.totalAnswered,
          reportedConcerns: c.concernCount,
          satisfactoryResponses: c.satisfactoryCount,
          concernPercentage: c.concernRate,
        })),
        topEvidenceFindings: (payload.topFindings || []).slice(0, 12).map((f) => ({
          category: f.category,
          reportedIssue: f.concern,
          householdMentions: f.count,
          shareOfRespondentsPercent: f.percentage,
          villagesAffected: (f.villagesAffected || []).slice(0, 10),
          ruleBasedPriorityScoreOutOf100: f.priorityScore,
          ruleBasedTier: f.priorityLevel,
        })),
      };

      const prompt = `Analyze the following anonymized Indian village household survey aggregate statistics from the "Gram Samasya AI" Community Service Project (CSP).

CRITICAL EVIDENCE & ETHICS RULES:
1. Base every claim strictly on the supplied counts and percentages. Never invent survey numbers, villages, or trends not supported by the data.
2. Never claim that any government authority or Panchayat has officially accepted responsibility; frame stakeholders strictly as "Suggested Panchayat Committee / Coordination Department".
3. Recommend practical, affordable, rural-appropriate interventions suited for Indian Gram Panchayats and Mandal coordination.
4. Explicitly state limitations of household perception survey data (e.g., sample size, self-reported perceptions, need for technical engineering verification).

ANONYMIZED SURVEY AGGREGATES:
${JSON.stringify(sanitizedSummary, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are a rural civic policy and Panchayat development analyst assisting a college Community Service Project in India. Produce clear, evidence-grounded, non-sensational JSON analysis strictly tied to the provided survey numbers.',
          temperature: 0.25,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: {
                type: Type.STRING,
                description: '2-3 sentence factual overview citing exact total responses, villages covered, and most frequent concerns.',
              },
              crossCategoryPatterns: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    patternTitle: { type: Type.STRING },
                    evidenceExplanation: { type: Type.STRING },
                    linkedCategories: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['patternTitle', 'evidenceExplanation', 'linkedCategories'],
                },
              },
              prioritizedInterventions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    issueTitle: { type: Type.STRING },
                    category: { type: Type.STRING },
                    urgencyRank: { type: Type.NUMBER },
                    evidenceCitation: { type: Type.STRING },
                    practicalSolution: { type: Type.STRING },
                    whyUseful: { type: Type.STRING },
                    suggestedStakeholder: { type: Type.STRING },
                    estimatedTimeframe: { type: Type.STRING },
                  },
                  required: [
                    'issueTitle',
                    'category',
                    'urgencyRank',
                    'evidenceCitation',
                    'practicalSolution',
                    'whyUseful',
                    'suggestedStakeholder',
                    'estimatedTimeframe',
                  ],
                },
              },
              actionRoadmap: {
                type: Type.OBJECT,
                properties: {
                  shortTerm: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Immediate low-cost actions (0-3 months).',
                  },
                  mediumTerm: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Mandal/block convergence actions (3-12 months).',
                  },
                  longTerm: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Structural infrastructure investments (1-3 years).',
                  },
                },
                required: ['shortTerm', 'mediumTerm', 'longTerm'],
              },
              dataLimitations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              'executiveSummary',
              'crossCategoryPatterns',
              'prioritizedInterventions',
              'actionRoadmap',
              'dataLimitations',
            ],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error('Model returned an empty response.');
      }

      const parsed = JSON.parse(rawText);
      res.json({
        available: true,
        source: 'gemini',
        generatedAt: new Date().toISOString(),
        analysis: parsed,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unexpected Gemini API error';
      res.status(502).json({
        available: false,
        reason: message,
      });
    }
  });

  const distPath = path.join(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' || (fs.existsSync(path.join(distPath, 'index.html')) && process.env.npm_lifecycle_event === 'start');

  if (isProd) {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gram Samasya AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
