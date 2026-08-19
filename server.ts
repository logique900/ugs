import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || 'dummy_key',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Endpoint OCR pour les factures
app.post('/api/ocr-invoice', upload.single('invoice'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier uploadé." });
    }

    const base64EncodeString = req.file.buffer.toString('base64');
    
    const response = await ai.models.generateContent({
      model: "gemini-pro-latest",
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

    const parsedJson = JSON.parse(response.text.trim());
    res.json(parsedJson);

  } catch (error: any) {
    console.error('Erreur OCR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint Assistant ERP
app.post('/api/chat-erp', async (req, res) => {
  try {
    const { prompt, erpContext } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-pro-latest",
      contents: [
        { text: `Vous êtes un assistant ERP expert. Voici le contexte actuel des données de l'ERP : \n${JSON.stringify(erpContext)}\n\nRépondez à la question de l'utilisateur de manière concise et professionnelle en utilisant ces données.` },
        { text: prompt }
      ]
    });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Erreur Chat ERP:', error);
    res.status(500).json({ error: error.message });
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
