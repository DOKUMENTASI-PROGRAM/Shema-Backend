/**
 * Simple Seeding Script for Booking System Testing
 * Focus on minimal data that can be created without foreign key issues
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xlrwvzwpecprhgzfcqxw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhscnd2endwZWNwcmhnemZjcXh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTkxMzQwNCwiZXhwIjoyMDc1NDg5NDA0fQ.30-63oLLTrNhN0meFH3Zn5_oTOQ8KBbbHxgj_4ECDp4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function seedMinimalData() {
  console.log('🌱 Starting minimal data seeding...\n');

  try {
    // 1. Create rooms (minimal columns)
    console.log('📍 Creating rooms...');
    const rooms = [
      { name: 'Studio A', capacity: 5 },
      { name: 'Studio B', capacity: 3 },
      { name: 'Studio C', capacity: 8 }
    ];

    for (const room of rooms) {
      const { data, error } = await supabase
        .from('rooms')
        .insert(room)
        .select();

      if (error) {
        console.log(`⚠️  Room "${room.name}" might already exist:`, error.message);
      } else {
        console.log(`✅ Created room: ${room.name} (ID: ${data[0].id})`);
      }
    }

    // 2. Get existing rooms for availability
    const { data: existingRooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, name');

    if (roomsError) throw roomsError;

    console.log(`\n📅 Found ${existingRooms.length} rooms for availability setup`);

    // 3. Create room availability for all rooms
    console.log('\n📅 Creating room availability...');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const availabilityData = [];

    for (const room of existingRooms) {
      for (const day of days) {
        for (let hour = 9; hour <= 17; hour++) {
          availabilityData.push({
            room_id: room.id,
            day_of_week: day,
            start_time: `${hour.toString().padStart(2, '0')}:00`,
            end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
            is_available: true
          });
        }
      }
    }

    console.log(`📊 Total availability slots to create: ${availabilityData.length}`);

    // Insert in batches to avoid timeout
    const batchSize = 50;
    let successCount = 0;
    for (let i = 0; i < availabilityData.length; i += batchSize) {
      const batch = availabilityData.slice(i, i + batchSize);
      const { error } = await supabase
        .from('room_availability')
        .insert(batch);

      if (error) {
        console.log(`⚠️  Batch ${Math.floor(i/batchSize) + 1} error:`, error.message);
      } else {
        successCount += batch.length;
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1} (${batch.length} slots, total: ${successCount})`);
      }
    }

    console.log(`\n🎯 Seeding completed! Created ${successCount} availability slots.`);
    console.log('You can now test the booking APIs with this data.');

    console.log('\n🎯 Seeding completed successfully!');
    console.log('You can now test the booking APIs with this data.');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

// Run seeding
seedMinimalData();