# TravelConnect TripAI — no paid OpenAI API required

## Option A: Ollama (recommended for your MacBook; genuinely free local inference)

1. Download **Ollama for macOS** from https://ollama.com/download/mac and install/open Ollama.app. (macOS Sonoma 14+ required; Apple Silicon or Intel supported, Intel uses CPU.)
2. Open a new Terminal and download the lightweight model. The first download requires internet, and around 1.4 GB of free disk space:

   ```bash
   ollama pull qwen3:1.7b
   ollama list
   ```

   Want a larger model if your Mac has sufficient memory? Use `ollama pull qwen3:4b` (about 2.5 GB download) and set `TC_OLLAMA_MODEL=qwen3:4b`. The smaller model is usually a better starting point on a MacBook Air.

3. **Do not erase your existing Firebase settings**. In `~/TravelConnect/TravelConnect-MVP/.env`, add or update only:

   ```dotenv
   TC_AI_PROVIDER=ollama
   TC_OLLAMA_MODEL=qwen3:1.7b
   ```

4. You do **not** need to pay OpenAI, keep an OpenAI API key, or enable billing. With `TC_AI_PROVIDER=ollama`, any existing `TC_OPENAI_API_KEY` is ignored. For peace of mind, remove the OpenAI key from `.env` if you no longer want to use it.
5. Restart TravelConnect and check local AI status:

   ```bash
   cd ~/TravelConnect/TravelConnect-MVP
   npm run doctor
   npm run dev
   ```

6. Sign in with a TravelConnect account and open `http://localhost:5500/#assistant`. Ask: “How should I prepare for a road trip from Johannesburg to Durban?” The answer will come from the Ollama model running on your Mac, not a canned reply.

### Troubleshooting Ollama

- `zsh: command not found: ollama`: install the Mac app and launch it once so it installs its command-line shortcut. Restart Terminal if necessary.
- `Free local AI is offline`: open Ollama.app and check `http://127.0.0.1:11434/api/tags` in a browser. If you deliberately run Ollama without the app, run `ollama serve` in a separate Terminal.
- `Model missing`: run `ollama pull qwen3:1.7b` and retry. The model name in `.env` must match `ollama list`.
- Slow replies: the first question loads the model into memory. Use the 1.7B model on an 8 GB Mac; keep other large apps closed. Model quality and response speed depend on hardware.
- AI still says “offline” after starting Ollama: refresh your website and use `npm run doctor` to confirm the same Mac can reach the local model.
- Local Ollama is not internet-hosted. TravelConnect's Node server and Ollama must be able to communicate over the loopback network. Never expose Ollama's unauthenticated port `11434` to the public internet.

## Option B: Free Gemini API tier (more practical for a small hosted website)

Google offers **free-tier access with usage/rate limits** to certain Gemini API models. This does not require an OpenAI subscription. Eligibility, quotas, data-use policies and model availability can change. Check the current Gemini pricing page: https://ai.google.dev/gemini-api/docs/pricing.

1. Visit https://aistudio.google.com/apikey and create a Gemini Developer API key for a free-tier project. **Do not enable a paid billing tier** if you want to avoid charges.
2. Keep your Firebase configuration. Change only the following lines in `.env`:

   ```dotenv
   TC_AI_PROVIDER=gemini
   TC_GEMINI_API_KEY=YOUR_PRIVATE_GEMINI_KEY
   TC_GEMINI_MODEL=gemini-2.5-flash-lite
   ```

3. Run `npm run doctor` and `npm run dev`. The key is used exclusively on the Node server; it never reaches the web browser or GitHub.
4. Gemini returns an explicit quota error when free limits are reached; the app does not silently switch to a paid provider.

**Privacy:** Google says prompts under the Gemini Developer API free tier may be used to improve its products. Never send private passenger, driver, payment, location, or identity information without the required privacy notices, safeguards, and an appropriate provider agreement. TravelConnect currently sends only the user's question; it does not automatically forward booking records.

## Hosting and costs

A laptop running Ollama is a good *free development setup*, not a 24/7 public AI service. Running local AI in production requires a machine with adequate CPU/GPU/RAM, availability and hosting costs. Gemini's free API tier can cover limited public usage, but it has caps and no guaranteed production scale. Neither option removes the cost of hosting TravelConnect's Node server and SQLite database, or the costs of future payments, GPS, licensed weather and verification providers.

## Security

`.env` and `data/` are excluded by `.gitignore`. Keep them private. Never commit any secret provider key. If your key has been shared or pushed previously, revoke/rotate it in the provider dashboard.
