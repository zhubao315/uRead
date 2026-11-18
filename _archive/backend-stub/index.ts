import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { DatabaseService } from './services/DatabaseService';

// Load environment variables
dotenv.config();

class App {
  public app: express.Application;
  private dbService: DatabaseService;

  constructor() {
    this.app = express();
    this.dbService = new DatabaseService();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    // Performance middleware
    this.app.use(compression());
    this.app.use(morgan(process.env.LOG_LEVEL as string || 'info'));

    // Body parsing middleware
    this.app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await this.dbService.initialize();
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      process.exit(1);
    }
  }

  private initializeRoutes(): void {
    const routes = [
      require('./routes/health'),
      require('./routes/notes'),
      require('./routes/booklists'),
      require('./routes/cards')
    ];

    routes.forEach(route => {
      this.app.use('/api', route.default);
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    });

    // Error handling middleware
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error:', error);

      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    });
  }

  public async start(port?: number): Promise<void> {
    const portNum = port || parseInt(process.env.PORT as string) || 3001;

    await this.initializeDatabase();

    this.app.listen(portNum, () => {
      console.log(`🚀 uRead server running on port ${portNum}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`📊 Health check: http://localhost:${portNum}/api/health`);
    });
  }
}

const app = new App();

if (require.main === module) {
  app.start();
}

export default app;