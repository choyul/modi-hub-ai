/**
 * 로컬 개발 서버.
 * 배포(Vercel)에서는 api/*.ts 가 서버리스 함수로 동작하므로 이 파일은 실행되지 않는다.
 * 두 환경이 갈라지지 않도록 같은 핸들러를 그대로 재사용한다.
 *
 *   npm run dev:server
 */
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import recommendHandler from './api/recommend-spaces';
import demandHandler from './api/demand';
import statsHandler from './api/stats';
import reservationHandler from './api/reservation';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  app.post('/api/recommend-spaces', (req, res) => recommendHandler(req, res));
  app.post('/api/demand', (req, res) => demandHandler(req, res));
  app.get('/api/stats', (req, res) => statsHandler(req, res));
  app.post('/api/reservation', (req, res) => reservationHandler(req, res));
  app.get('/api/reservation', (req, res) => reservationHandler(req, res));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MODI Hub dev server → http://localhost:${PORT}`);
    if (!process.env.GEMINI_API_KEY) {
      console.warn('경고: GEMINI_API_KEY 미설정 — 검색 API가 502를 반환합니다.');
    }
  });
}

startServer();
