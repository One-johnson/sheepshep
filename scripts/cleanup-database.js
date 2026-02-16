/**
 * Database Cleanup Script
 * 
 * This script cleans all data from the Convex database except the first admin user.
 * WARNING: This will delete ALL data! Use only in development!
 * 
 * Usage:
 *   node scripts/cleanup-database.js
 * 
 * Make sure you have CONVEX_URL and a valid admin auth token set in your environment.
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function cleanupDatabase() {
  console.log('⚠️  WARNING: This will delete ALL data from your Convex database!');
  console.log('⚠️  Only the first admin user will be kept.\n');
  
  const confirm = await question('Type "DELETE ALL DATA" to confirm: ');
  
  if (confirm !== 'DELETE ALL DATA') {
    console.log('❌ Cleanup cancelled.');
    rl.close();
    return;
  }

  const token = await question('\nEnter your admin auth token (from localStorage.getItem("authToken")): ');
  
  if (!token || token.trim() === '') {
    console.log('❌ Token is required.');
    rl.close();
    return;
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
  
  if (!convexUrl) {
    console.log('❌ CONVEX_URL not found. Set NEXT_PUBLIC_CONVEX_URL or CONVEX_URL environment variable.');
    rl.close();
    return;
  }

  try {
    console.log('\n🔄 Cleaning database...');
    
    const response = await fetch(`${convexUrl}/cleanup/cleanDatabase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: token.trim() }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to clean database: ${error}`);
    }

    const result = await response.json();
    
    console.log('\n✅ Database cleaned successfully!');
    console.log(`📊 Total records deleted: ${Object.values(result.deletedCounts).reduce((sum, count) => sum + count, 0)}`);
    console.log('\nDeleted counts by table:');
    Object.entries(result.deletedCounts).forEach(([table, count]) => {
      console.log(`  - ${table}: ${count}`);
    });
    
    if (result.keptFirstAdmin) {
      console.log(`\n👤 Kept first admin: ${result.keptFirstAdmin}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

cleanupDatabase();
