import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

export async function GET(req: NextRequest) {
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    // Check current enum values
    const before = await client.query(
      `SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'RoomType')`
    );
    
    // Add FAMILY if missing
    await client.query(`ALTER TYPE "RoomType" ADD VALUE IF NOT EXISTS 'FAMILY'`);
    
    // Check after
    const after = await client.query(
      `SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'RoomType')`
    );
    
    await client.end();
    
    return NextResponse.json({
      before: before.rows.map(r => r.enumlabel),
      after: after.rows.map(r => r.enumlabel),
      added: !before.rows.some(r => r.enumlabel === 'FAMILY'),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
