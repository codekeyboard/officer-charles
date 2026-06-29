# Officer Charles

Officer Charles is a Laravel/Inertia frontend with a Core V3 Python service for chat and live visa interview practice.

## Requirements

- PHP and Composer
- Node.js and npm
- Python 3.12+
- OpenAI API key for live interview
- Gemini API key for chat mode, if using Gemini-backed chat replies

## Environment

Create or update `.env` in the project root:

```bash
cp .env.example .env
```

Set the keys used by the services:

```env
OPENAI_API_KEY=your_openai_key
OPENAI_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
CORE_V3_URL=http://127.0.0.1:8020
```

`OPENAI_KEY` and `OPENAI_API_KEY` are both supported by Core V3. Keeping both set is the simplest local setup.

## Install

Install PHP dependencies:

```bash
composer install
```

Install frontend dependencies:

```bash
npm install
```

Install Core V3 Python dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r core_v3/requirements.txt
```

## Run The Project

Start the Laravel app:

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

Start Vite:

```bash
npm run dev -- --host 127.0.0.1
```

Start Core V3:

```bash
cd core_v3
python3 -m uvicorn server:app --host 127.0.0.1 --port 8020
```

Open the app:

```text
http://127.0.0.1:8000/visa-ai
```

Useful service URLs:

```text
Laravel: http://127.0.0.1:8000
Vite:    http://127.0.0.1:5173
Core:    http://127.0.0.1:8020
```

## Live Interview Smoke Test

The example script drives the running Core V3 live websocket using text commands. It tests both Training Session and Real Interview Simulation for F-1 and B1/B2 flows, verifies that replies arrive, checks question advancement, and fails if the assistant gets stuck.

Run all live smoke tests:

```bash
source .venv/bin/activate
python example/live_interview_flow_test.py
```

Run only Real Interview Simulation for F-1:

```bash
python example/live_interview_flow_test.py --mode interview --visa f1
```

Run faster by not waiting for generated audio:

```bash
python example/live_interview_flow_test.py --no-wait-audio
```

The smoke test calls the real Core V3 websocket and OpenAI-backed live assistant, so `OPENAI_API_KEY` or `OPENAI_KEY` must be configured and Core V3 must be running.

## Checks

Type-check the frontend:

```bash
npm run types:check
```

Build the frontend:

```bash
npm run build
```

Compile Core V3 Python files:

```bash
python3 -m py_compile core_v3/assistants/realtime/LiveInterviewAssistant.py core_v3/server.py
```
