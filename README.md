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