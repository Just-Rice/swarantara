# Recordings go here

Put each raga recording in this folder with **exactly** these filenames.
Any raga without a file plays a soft placeholder drone instead, so the site
works before every recording is ready.

| Raga | Filename | Used for |
|---|---|---|
| Yaman | `yaman.mp3` | Stressed |
| Ahir Bhairav | `ahir-bhairav.mp3` | Anxious |
| Bhairavi | `bhairavi.mp3` | Sad |
| Bageshree | `bageshree.mp3` | Angry / restless, Sleep Mode |
| Malkauns | `malkauns.mp3` | Tired / can't sleep, Sleep Mode (default) |
| Darbari Kanada | `darbari.mp3` | Sleep Mode |
| Bhupali | `bhupali.mp3` | Unfocused |
| Desh | `desh.mp3` | Happy |

Tips:
- MP3 at about 128 kbps (about 1 MB per minute) keeps the site fast.
  Cloudflare Pages allows at most 25 MB per file.
- Recordings loop, so 3–10 minutes each is plenty.
- To use a different filename or raga, edit `js/ragas.js`.
