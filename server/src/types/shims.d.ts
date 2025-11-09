declare module 'pg' {
  export class Pool {
    constructor(config?: any);
    query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>;
  }
}

declare module 'cors' {
  import { RequestHandler } from 'express';
  function cors(options?: Record<string, unknown>): RequestHandler;
  export default cors;
}

declare module 'uuid' {
  export function v4(): string;
}
