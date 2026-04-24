# SRM Full Stack Engineering Challenge

REST API + Frontend for hierarchical graph analysis with cycle detection.

## Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start server
npm start
#    → http://localhost:3000      (frontend)
#    → POST http://localhost:3000/bfhl  (API)
```

## Deploy to Render

1. Push code to a **public GitHub repo**.
2. Go to [render.com](https://render.com) → **New → Web Service**.
3. Connect your GitHub repo.
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. Click **Create Web Service**. Done!

## API Usage

```bash
curl -X POST https://YOUR-APP.onrender.com/bfhl \
  -H "Content-Type: application/json" \
  -d '{"data":["A->B","A->C","B->D","X->Y","Y->Z","Z->X"]}'
```

## Project Structure

```
├── index.js          # Express backend (POST /bfhl)
├── package.json
├── public/
│   └── index.html    # Frontend (HTML + CSS + JS)
├── .gitignore
└── README.md
```
