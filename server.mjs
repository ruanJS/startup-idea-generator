import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config();

const geminiApiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
const configuredGeminiModel = process.env.GEMINI_MODEL;
const geminiModel = configuredGeminiModel === 'gemini-2.0-flash'
  ? 'gemini-3.8-flash'
  : configuredGeminiModel || 'gemini-3.8-flash';

function normalizeGeminiText(value) {
  return value
    .replace(/\\([\\*_#`~\-])/g, '$1')
    .replace(/&#x20;/gi, ' ')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .split('\n')
    .map(line => line
      .replace(/^\s*#{1,6}\s*/, '')
      .replace(/^\s*---+\s*$/, '')
      .replace(/^\s*[-*]\s+/, '• ')
      .trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const app = express();
const port = process.env.STARTUP_PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/favicon.ico', (_req, res) => {
  res.sendStatus(204);
});

app.use((req, res, next) => {
  const allowedOrigins = new Set([
    'http://127.0.0.1:5500',
    'http://localhost:5500',
  ]);
  const origin = req.headers.origin;

  if (allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());

// Faz uma requisição de texto para a API Gemini do Google AI Studio.
async function makeGeminiRequest(input, attempt = 1) {
  if (!geminiApiKey) {
    const error = new Error('GOOGLE_AI_API_KEY não configurada.');
    error.code = 'MISSING_GEMINI_API_KEY';
    throw error;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': geminiApiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: [
          'Você é um assistente especializado em startups.',
          'Responda sempre em português do Brasil, mesmo que o usuário escreva de outra forma.',
          'Entregue uma resposta completa, clara e prática; nunca interrompa a resposta no meio de uma frase.',
          'Organize a ideia com: Nome, Problema, Solução, Público-alvo, Diferencial e primeiro MVP.',
          'Não use Markdown, asteriscos, barras invertidas ou caracteres de escape; use texto simples com títulos e listas.',
        ].join(' ') }],
      },
      contents: [{
        role: 'user',
        parts: [{ text: `Crie uma ideia de startup baseada neste conceito: ${input}` }],
      }],
      generationConfig: {
        maxOutputTokens: 3048,
        temperature: 0.7,
        thinkingConfig: {
          thinkingLevel: 'low',
        },
      },
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error?.message || `Modelo respondeu com HTTP ${response.status}.`);
    error.status = response.status;
    const isRetryable = response.status === 429 || response.status === 503;
    if (isRetryable && attempt <= 3) {
      const waitTime = attempt * 4000;
      console.log(`Tentativa ${attempt}: Modelo temporariamente indisponível (${response.status}). Tentando novamente em ${waitTime / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return makeGeminiRequest(input, attempt + 1);
    }
    throw error;
  }

  const candidate = data.candidates?.[0];
  if (candidate?.finishReason === 'MAX_TOKENS') {
    const error = new Error('O Modelo interrompeu a resposta por atingir o limite de tokens.');
    error.code = 'INCOMPLETE_GEMINI_RESPONSE';
    error.status = 502;
    throw error;
  }

  const text = candidate?.content?.parts
    ?.map(part => part.text || '')
    .join('')
    .trim();

  if (!text) {
    const error = new Error('O Modelo não retornou texto para esse conceito.');
    error.code = 'EMPTY_GEMINI_RESPONSE';
    throw error;
  }

  return normalizeGeminiText(text);
}

// Rota para gerar ideias de startup
app.post('/generate-startup', async (req, res) => {
  console.log('Requisição recebida na rota /generate-startup');
  const { input } = req.body;

  // Verifica se o input é válido
  if (!input) {
    console.log('Input inválido:', input);
    return res.status(400).json({ error: 'Input não pode ser vazio.' });
  }

  try {
    console.log('Chamando o Gemini com o input:', input);
    const startupIdea = await makeGeminiRequest(input);
    console.log('Resposta do Gemini recebida:', startupIdea);
    res.json({ startupIdea });
  } catch (error) {
    console.error('Erro ao gerar ideia de startup:', error.message);
    if (error.code === 'MISSING_GEMINI_API_KEY') {
      return res.status(503).json({
        error: 'Configure a chave da LLM antes de gerar uma ideia.',
      });
    }

    if (error.code === 'INCOMPLETE_GEMINI_RESPONSE') {
      return res.status(502).json({
        error: 'O Modelo não conseguiu concluir a resposta. Tente novamente.',
      });
    }

    if (error.status === 401 || error.status === 403) {
      return res.status(error.status).json({
        error: 'A chave da LLM é inválida ou não tem acesso ao modelo configurado.',
      });
    }

    if (error.status === 429 || error.status === 503) {
      return res.status(error.status).json({
        error: 'O Modelo está temporariamente sobrecarregado. Aguarde alguns segundos e tente novamente.',
      });
    }

    res.status(500).json({
      error: 'Ocorreu um erro ao gerar a ideia de startup.',
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
