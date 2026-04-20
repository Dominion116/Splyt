declare global {
  namespace Express {
    interface Request {
      x402Receipt?: {
        id: string;
        amount: string;
        payer: string;
      };
    }
  }
}

export {};
