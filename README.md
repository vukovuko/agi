# AGI

Terminal-based AI agent with RAG, memory, and tool execution

## Setup

```bash
npm install
cp .env.example .env   # add your OPENAI_API_KEY
```

## Database

```bash
docker compose up -d
npm run db:push
```

## Run

```bash
npm run start
```

## Examples

```
> Read package.json and tell me the version
> Run npm test and fix any failures
> Ingest the documents from ./knowledge
> What does the material say about antihistamines?
> Fetch https://api.github.com/repos/facebook/react and tell me the star count
> Write a Python script that converts CSV to JSON, save it as convert.py
> List all files in src/ and explain the project structure
> Clear the knowledge base
```

Auto mode is on by default, safe tools (read, list, search) run without approval. Dangerous tools (write, delete, run commands) still ask for confirmation. Toggle with `/auto`