import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { autheliaGuard } from './middleware/auth';
import apiRouter from './routes/api';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Standard middlewares
app.use(cors());
app.use(express.json());

// Global Authelia Zero-Trust header auth guard
app.use(autheliaGuard);

// API Routes
app.use('/api', apiRouter);

// Sample downstream API route to demonstrate and verify user identity
app.get('/api/me', (req: Request, res: Response) => {
  res.json({
    message: 'Authenticated successfully via Authelia proxy headers',
    user: req.user,
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

export default app;
