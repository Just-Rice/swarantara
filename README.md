# SWARANTARA

Website for our science exhibition project, **"The Benefits of Indian Classical Music for the Emotional Well-being of Teenagers"**.

| Page | What it does |
|---|---|
| `index.html` | Home and About: the topic, the three parts of the project, the team |
| `raga-relief.html` | **Raga Relief**: pick a mood, rate how you feel, listen to a matching raga, rate again. Results are saved on the device and can be downloaded as CSV. |
| `sleep.html` | **Sleep Mode** (the Sleep Lamp): the screen fades like a sunset while a night raga plays, then everything switches off after 20–30 minutes |

It is plain HTML, CSS and JavaScript, with no build step and nothing to install.

## Editing

- **Moods, ragas, descriptions:** `js/ragas.js`
- **Recordings:** put MP3 files in `audio/` (see `audio/README.md` for filenames).
  Without a recording, a placeholder tanpura drone plays.
- **Team names and footer credits:** search for `TEAM` in `index.html`.
- **Colours and fonts:** the top of `css/style.css`.

## Try it on your computer

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening the HTML file directly also works, but it always plays the placeholder drone.

For quick demos, add `?speed=60` to a page URL to make the timers run 60× faster.
For example, `sleep.html?speed=60` finishes a 20-minute session in 20 seconds.

## Publishing on Cloudflare Pages (free)

**Option A: connect this GitHub repo (updates automatically on every push)**
1. Sign up for free at https://dash.cloudflare.com.
2. Go to **Workers & Pages → Create → Pages → Connect to Git** and pick this repository.
3. Set the production branch to `main`, framework preset to **None**, build command to empty, and build output directory to `/`.
4. Click **Save and Deploy**. The site appears at `https://<project-name>.pages.dev`.

**Option B: drag and drop**
1. Go to **Workers & Pages → Create → Pages → Upload assets**.
2. Drag this whole folder in, then click **Deploy**.

`_headers` sets caching rules and `404.html` is the not-found page. Cloudflare uses both automatically.

## Data and privacy

Raga Relief stores each session's mood, raga and before/after rating **only in that browser's local storage**. No names are collected and nothing is sent anywhere.
Use **Download data (CSV)** on the Raga Relief page to collect results from the exhibition device for your analysis.
