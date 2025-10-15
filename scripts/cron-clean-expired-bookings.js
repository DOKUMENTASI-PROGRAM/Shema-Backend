#!/usr/bin/env node

/**
 * Cron Job: Clean Expired Bookings
 * 
 * Runs the clean_expired_bookings() database function to mark
 * pending bookings that have passed their expiration date as 'expired'.
 * 
 * Usage:
 *   node scripts/cron-clean-expired-bookings.js
 * 
 * Recommended Schedule:
 *   Daily at midnight: 0 0 * * *
 *   Or every 6 hours: 0 */6 * * *
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables')
  console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

/**
 * Main function to clean expired bookings
 */
async function cleanExpiredBookings() {
  console.log('🧹 Starting expired bookings cleanup...')
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`)
  console.log('')

  try {
    // Call the database function
    const { data, error } = await supabase.rpc('clean_expired_bookings')

    if (error) {
      console.error('❌ Error calling clean_expired_bookings():', error)
      throw error
    }

    // The function returns the number of bookings marked as expired
    const expiredCount = data || 0

    console.log(`✅ Cleanup completed successfully`)
    console.log(`📊 Bookings marked as expired: ${expiredCount}`)
    
    if (expiredCount > 0) {
      console.log('')
      console.log('📧 Consider sending notification emails to applicants')
      console.log('   about their expired bookings.')
    }

    return expiredCount

  } catch (error) {
    console.error('❌ Fatal error during cleanup:', error)
    throw error
  }
}

/**
 * Get statistics about bookings
 */
async function getBookingStats() {
  try {
    // Count bookings by status
    const { data: stats, error } = await supabase
      .from('bookings')
      .select('status')

    if (error) {
      console.error('⚠️  Warning: Could not fetch booking stats:', error.message)
      return null
    }

    const statusCounts = stats.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1
      return acc
    }, {})

    return statusCounts

  } catch (error) {
    console.error('⚠️  Warning: Error fetching stats:', error)
    return null
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  EXPIRED BOOKINGS CLEANUP - Shema Music Backend')
  console.log('═══════════════════════════════════════════════════════')
  console.log('')

  try {
    // Get stats before cleanup
    console.log('📊 Booking Statistics (Before Cleanup):')
    const statsBefore = await getBookingStats()
    if (statsBefore) {
      Object.entries(statsBefore).forEach(([status, count]) => {
        console.log(`   ${status.padEnd(12)}: ${count}`)
      })
    }
    console.log('')

    // Run cleanup
    const expiredCount = await cleanExpiredBookings()

    // Get stats after cleanup
    if (expiredCount > 0) {
      console.log('')
      console.log('📊 Booking Statistics (After Cleanup):')
      const statsAfter = await getBookingStats()
      if (statsAfter) {
        Object.entries(statsAfter).forEach(([status, count]) => {
          console.log(`   ${status.padEnd(12)}: ${count}`)
        })
      }
    }

    console.log('')
    console.log('═══════════════════════════════════════════════════════')
    console.log('✅ Cron job completed successfully')
    console.log('═══════════════════════════════════════════════════════')
    
    process.exit(0)

  } catch (error) {
    console.log('')
    console.log('═══════════════════════════════════════════════════════')
    console.log('❌ Cron job failed')
    console.log('═══════════════════════════════════════════════════════')
    
    process.exit(1)
  }
}

// Run the script
main()

