import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  
  try {
    // Simple ping query to check database connectivity and wake it up
    // This will wake up Neon database if it's sleeping (may take 2-3 seconds)
    await db.execute(sql`SELECT 1 as ping`);
    
    const responseTime = Date.now() - startTime;
    
    // Log wake-up time for debugging
    if (responseTime > 2000) {
      console.log(`🔄 Database woke up from sleep mode (${responseTime}ms)`);
    }
    
    return res.status(200).json({
      status: 'active',
      responseTime,
      timestamp: new Date().toISOString(),
      message: responseTime > 2000 
        ? `Database woke up from sleep (${responseTime}ms)` 
        : 'Database is active and responding',
      wasAsleep: responseTime > 2000
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Database ping failed:', error);
    
    return res.status(500).json({
      status: 'error',
      responseTime,
      timestamp: new Date().toISOString(),
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}