import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config();

// Instancia o OpenAI usando a chave de API do ambiente
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const port = process.env.PORT || 3000;

// Middleware para servir arquivos estáticos (HTML, CSS, JS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para analisar JSON
app.use(express.json());

// Função para fazer requisições à API do OpenAI
async function makeOpenAIRequest(input, attempt = 1) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Você é um assistente especializado em startups.' },
          { role: 'user', content: `Gere uma ideia de startup baseada no seguinte conceito: ${input}` },
        ],
        max_tokens: 50,
      });
      
      return completion.choices[0].message.content.trim();
    } catch (error) {
      if (error.status === 429 && attempt <= 3) { // Limite de 3 tentativas
        console.log(`Tentativa ${attempt}: Limite de requisições atingido. Aguardando antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Aguarda 10 segundos
        return makeOpenAIRequest(input, attempt + 1); // Tenta novamente
      } else {
        console.error('Erro ao fazer requisição para a API OpenAI:', error);
        throw error; // Lança outros erros para tratamento
      }
    }
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
    console.log('Chamando a função makeOpenAIRequest com o input:', input);
    const startupIdea = await makeOpenAIRequest(input);
    console.log('Resposta da API OpenAI recebida:', startupIdea);
    res.json({ startupIdea });
  } catch (error) {
    console.error('Erro ao gerar ideia de startup:', error);
    res.status(500).json({ error: 'Ocorreu um erro ao gerar a ideia de startup.' });
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
