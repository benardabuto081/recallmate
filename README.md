# RecallMate — Your study partner. Your memory test.

An AI conversational active-recall study tool. Upload notes (PDF / TXT / DOCX), answer questions by voice or text, get follow-ups and hints, and see a recall report. Built with Next.js (App Router), TypeScript, Tailwind CSS and Google Gemini.

## Run locally
```bash
npm install
cp .env.example .env.local   # then add your key (optional — demo mode works without it)
npm run dev                  # http://localhost:3000
npm run typecheck && npm run build
```

## Gemini API key
1. Create a key at <https://aistudio.google.com/apikey>.
2. Put it in `.env.local`: `GEMINI_API_KEY=your_key`. Optionally set `GEMINI_MODEL` (default `gemini-2.5-flash`; use any model your key can access).
3. Restart `npm run dev`. The key is read only in server route handlers (`/api/*`) and is never sent to the browser.

Without a key the app runs in clearly labelled **demo mode** (built-in Operating Systems pack, predefined questions, keyword-rule feedback — not AI).

## Push to GitHub
```bash
cd recallmate
git init && git add . && git commit -m "RecallMate MVP"
git branch -M main
git remote add origin https://github.com/<you>/recallmate.git
git push -u origin main
```

## Deploy to Vercel
1. Import the GitHub repo at <https://vercel.com/new> (framework auto-detected as Next.js).
2. Add environment variable `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) under Project Settings → Environment Variables.
3. Deploy. Voice input needs HTTPS (Vercel provides it) and a Chromium-based browser or Safari.

## How it works / limits
- Documents are parsed in the browser (`pdfjs-dist`, `mammoth`). Limits: 10 MB, 200k extracted characters, 150 PDF pages. Long documents are chunked and topic-relevant passages (up to ~24k characters) are sent when a session starts.
- Notes are kept in memory only; refresh = upload again. Only session summaries (scores, concept names) are saved in `localStorage`; clear them from the dashboard.
- Scoring is computed locally from recorded assessments (see `lib/assessment.ts`), not by the model.
- Scanned/image-only PDFs have no extractable text and are rejected. Speech recognition quality and availability depend on the browser.
