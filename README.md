#  AI Labs da ResumoCast Ventures Projeto - Gerador de Ideias de Startup

Este projeto é uma aplicação web simples que gera ideias de startups com base em descrições fornecidas pelo usuário. A aplicação utiliza a API do OpenAI (GPT-3.5-turbo) para gerar respostas criativas e inovadoras.

## Tecnologias Utilizadas

- **Node.js** com **Express** para criar o servidor backend.
- **OpenAI API** para gerar as ideias de startups.
- **HTML/CSS/JavaScript** no frontend.
- **dotenv** para gerenciar variáveis de ambiente.

## Funcionalidades

- O usuário pode inserir uma descrição de conceito para uma startup.
- A aplicação envia essa descrição para a API do OpenAI.
- O sistema responde com uma ideia de startup com base no conceito fornecido.
- Feedback de sucesso ou erro é exibido tanto no console quanto na interface do usuário.

## Como Rodar o Projeto Localmente

### Pré-requisitos

- Node.js instalado em sua máquina.
- Uma conta e uma chave de API no [OpenAI](https://beta.openai.com/signup/).

### Passos

1. **Clone o repositório:**

   ```bash
   git clone https://github.com/seu-usuario/projeto-startup.git
   cd projeto-startup
   ```

2. **Instale as dependências:**

   ```bash
   npm install
   ```

3. **Crie um arquivo `.env` na raiz do projeto:**

   No arquivo `.env`, adicione sua chave de API do OpenAI:

   ```env
   OPENAI_API_KEY=sua-chave-aqui
   ```

4. **Inicie o servidor:**

   ```bash
   npm start
   ```

5. **Acesse a aplicação no navegador:**

   Acesse `http://localhost:3000` e utilize o formulário para gerar suas ideias de startups.

## Estrutura do Projeto

```bash
projeto-startup/
│
├── public/               # Arquivos estáticos (HTML, CSS, JS)
│   ├── css/
│   │   └── styles.css    # Estilos da página
│   └── index.html        # Frontend principal
│
├── server.mjs            # Arquivo principal do servidor Express
├── package.json          # Dependências e scripts npm
├── .env                  # Variáveis de ambiente
└── README.md             # Documentação do projeto
```

## Dependências

- express
- openai
- dotenv

## Considerações Finais

Sinta-se à vontade para contribuir com melhorias ou correções!
