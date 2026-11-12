# Palliative Digest

A phone app (installable web app) with a monthly palliative medicine literature digest from PubMed, a Fast Fact of the month from mypcnow.org, and the latest GeriPal podcast episode.

- Live app: https://momil88.github.io/palliative-digest/
- Content lives in `data/issues.json`, `data/fastfacts.json` and `data/podcast.json`. A scheduled Claude task adds a new month on the 1st.
- Summaries are written from PubMed abstracts and show notes. Check the original before changing practice.
