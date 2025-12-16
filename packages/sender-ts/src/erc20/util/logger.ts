export const logger = {
  info: (message: string) => {
    console.log(`[${new Date().toISOString()}] ${message}`);
  },
  error: (message: string, error?: unknown) => {
    console.error(`[${new Date().toISOString()}] ${message}`, error);
  },
};

