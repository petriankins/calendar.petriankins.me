# My Year Planner (opinionated)

A simple one-pager app to plan your year. It’s an opinionated planner I’ve been using for years for my own quirky needs, but maybe you’ll find it useful too.

**The idea is simple:** it's a digital imitation of a wall calendar. You can paint days in different colors, add emojis and textures, write any text on them, and shape the year your way. That's basically it. Use it however you want and don't forget to save your data.

It all works locally in your browser, no server or cloud involved. 100% private and offline.

Ideas, bugfixes and PRs are welcome. Open [issues](https://github.com/vas3k/year.vas3k.cloud/issues) to discuss.

> 😎 **Demo:** download [demo.json](./examples/demo.json), open [year.vas3k.cloud](https://year.vas3k.cloud), scroll down, click "Load Data" and select this file

<https://github.com/user-attachments/assets/89565584-4bc5-451c-82ad-aa13f80e6d8e>

![](./docs/screen1.jpeg)

![](./docs/screen2.jpeg)

![](./docs/screen3.jpeg)

## Run it yourself

```bash
npm i
npm run dev
```

Then open <http://localhost:3000/>. Voilá!

For production deployments use `npm run build`

## Run in docker-compose

```yaml
# docker-compose.yml
---

services:
  app:
    build:
      context: https://github.com/vas3k/year.vas3k.cloud.git
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
```

## Google Drive Integration (Optional)

To enable saving/loading from Google Drive, you need to set up a Google Cloud Project.

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Enable **Google Drive API** for this project.
4. Configure **OAuth Consent Screen** (External, unless you have a Workspace).
5. Create **Credentials**:
   - **OAuth Client ID** (Web application). Add `http://localhost:3000` to "Authorized JavaScript origins".
   - **API Key**.
6. Create a `.env` file in the root directory (see `.env.example`):

```bash
REACT_APP_GOOGLE_CLIENT_ID=your-client-id
REACT_APP_GOOGLE_API_KEY=your-api-key
```
