import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

// Lazy Gemini Client initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('La clé API GEMINI_API_KEY n\'est pas configurée dans l\'environnement.');
    }
    aiClient = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==========================================
// REAL-TIME POS CART SYNC (SMARTPHONE <-> PC)
// ==========================================
interface PosCartSyncPayload {
  syncKey: string;
  cart: any[];
  posClientId?: string;
  posPaymentMode?: string;
  remiseGlobale?: number;
  lastAction?: string;
  lastItemName?: string;
  senderDeviceId?: string;
  deviceType?: 'smartphone' | 'desktop' | 'tablet';
  updatedAt: number;
}

const posSyncStore = new Map<string, PosCartSyncPayload>();
const posSseSubscribers = new Map<string, Set<express.Response>>();

// Stream SSE pour la synchronisation instantanée Smartphone <-> PC
app.get('/api/caisse/stream/:syncKey', (req, res) => {
  const syncKey = req.params.syncKey;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  if (!posSseSubscribers.has(syncKey)) {
    posSseSubscribers.set(syncKey, new Set());
  }
  const subscribers = posSseSubscribers.get(syncKey)!;
  subscribers.add(res);

  // Envoyer l'état actuel s'il existe
  const currentState = posSyncStore.get(syncKey);
  if (currentState) {
    res.write(`data: ${JSON.stringify({ type: 'sync', payload: currentState })}\n\n`);
  } else {
    res.write(`data: ${JSON.stringify({ type: 'connected', syncKey })}\n\n`);
  }

  // Heartbeat keep-alive toutes les 20 secondes
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    subscribers.delete(res);
    if (subscribers.size === 0) {
      posSseSubscribers.delete(syncKey);
    }
  });
});

// Récupérer l'état du panier d'une session
app.get('/api/caisse/sync/:syncKey', (req, res) => {
  const syncKey = req.params.syncKey;
  const state = posSyncStore.get(syncKey);
  if (state) {
    res.json(state);
  } else {
    res.json({ syncKey, cart: [], updatedAt: Date.now() });
  }
});

// Mettre à jour le panier et diffuser instantanément aux autres appareils connectés
app.post('/api/caisse/sync', (req, res) => {
  try {
    const { syncKey, cart, posClientId, posPaymentMode, remiseGlobale, lastAction, lastItemName, senderDeviceId, deviceType } = req.body;
    if (!syncKey) {
      return res.status(400).json({ error: "syncKey requis pour la synchronisation." });
    }

    const payload: PosCartSyncPayload = {
      syncKey,
      cart: Array.isArray(cart) ? cart : [],
      posClientId: posClientId || '',
      posPaymentMode: posPaymentMode || 'Espèces',
      remiseGlobale: typeof remiseGlobale === 'number' ? remiseGlobale : 0,
      lastAction: lastAction || 'update',
      lastItemName: lastItemName || '',
      senderDeviceId: senderDeviceId || 'unknown',
      deviceType: deviceType || 'desktop',
      updatedAt: Date.now()
    };

    posSyncStore.set(syncKey, payload);

    // Diffuser à tous les terminaux abonnés (Smartphone & PC)
    const subscribers = posSseSubscribers.get(syncKey);
    if (subscribers && subscribers.size > 0) {
      const message = `data: ${JSON.stringify({ type: 'sync', payload })}\n\n`;
      subscribers.forEach(client => {
        try {
          client.write(message);
        } catch {
          subscribers.delete(client);
        }
      });
    }

    res.json({ success: true, updatedAt: payload.updatedAt, subscribersCount: subscribers ? subscribers.size : 0 });
  } catch (error: any) {
    console.error('Erreur lors de la synchronisation de caisse:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur de synchronisation' });
  }
});


// Endpoint OCR pour les factures
app.post('/api/ocr-invoice', upload.single('invoice'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier uploadé." });
    }

    const ai = getGeminiClient();
    const base64EncodeString = req.file.buffer.toString('base64');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: req.file.mimetype,
            data: base64EncodeString
          }
        },
        "Extract the invoice details into JSON: fournisseurNom (supplier name), numero (invoice number), date (YYYY-MM-DD), montantHT (number), montantTTC (number), and a list of lignes with designation, quantite (number), prixUnitaireHT (number), totalHT (number), totalTTC (number)."
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fournisseurNom: { type: Type.STRING },
            numero: { type: Type.STRING },
            date: { type: Type.STRING },
            montantHT: { type: Type.NUMBER },
            montantTTC: { type: Type.NUMBER },
            lignes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  designation: { type: Type.STRING },
                  quantite: { type: Type.NUMBER },
                  prixUnitaireHT: { type: Type.NUMBER },
                  totalHT: { type: Type.NUMBER },
                  totalTTC: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });

    const parsedJson = JSON.parse(response.text ? response.text.trim() : '{}');
    res.json(parsedJson);

  } catch (error: any) {
    console.error('Erreur OCR:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l\'analyse du document.' });
  }
});

// Endpoint Assistant ERP
app.post('/api/chat-erp', async (req, res) => {
  try {
    const { prompt, erpContext } = req.body;
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: `Vous êtes un assistant ERP expert. Voici le contexte actuel des données de l'ERP : \n${JSON.stringify(erpContext)}\n\nRépondez à la question de l'utilisateur de manière concise et professionnelle en utilisant ces données.` },
        { text: prompt || '' }
      ]
    });
    res.json({ text: response.text || '' });
  } catch (error: any) {
    console.error('Erreur Chat ERP:', error);
    res.status(500).json({ error: error.message || 'Erreur de communication avec l\'assistant IA.' });
  }
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Express Global Error:", err);
  if (req.path.startsWith("/api/")) {
    res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
  } else {
    next(err);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
