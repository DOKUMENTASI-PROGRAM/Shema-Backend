/**
 * Script untuk seeding data dummy lengkap untuk testing realtime jadwal
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const { randomUUID } = require('crypto');

// Generate valid UUIDs
const instructor1Id = randomUUID();
const instructor2Id = randomUUID();
const room1Id = randomUUID();
const room2Id = randomUUID();
const course1Id = randomUUID();
const course2Id = randomUUID();
const schedule1Id = randomUUID();
const schedule2Id = randomUUID();
const schedule3Id = randomUUID();
const booking1Id = randomUUID();

async function seedData() {
  console.log('🌱 Starting data seeding...\n');

  try {
    // 1. Create instructor profiles
    console.log('👨‍🏫 Creating instructor profiles...');
    const instructors = [
      {
        user_id: instructor1Id,
        full_name: 'John Doe',
        specialization: ['guitar', 'piano'],
        bio: 'Experienced music instructor with 10 years experience',
        email: 'john@shema.com',
        wa_number: '+6281234567890',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        user_id: instructor2Id,
        full_name: 'Jane Smith',
        specialization: ['violin', 'cello'],
        bio: 'Classical music specialist',
        email: 'jane@shema.com',
        wa_number: '+6281234567891',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const instructor of instructors) {
      const { error } = await supabase
        .from('instructor_profiles')
        .upsert(instructor, { onConflict: 'user_id' });

      if (error) console.error('Error creating instructor:', error);
      else console.log(`✓ Created instructor: ${instructor.full_name}`);
    }

    // 2. Create rooms
    console.log('\n🏢 Creating rooms...');
    const rooms = [
      {
        id: room1Id,
        name: 'Studio A',
        capacity: 10,
        description: 'Main practice room with grand piano',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: room2Id,
        name: 'Studio B',
        capacity: 8,
        description: 'Secondary practice room',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const room of rooms) {
      const { error } = await supabase
        .from('rooms')
        .upsert(room, { onConflict: 'id' });

      if (error) console.error('Error creating room:', error);
      else console.log(`✓ Created room: ${room.name}`);
    }

    // 3. Create room availability
    console.log('\n📅 Creating room availability...');
    const roomAvailability = [
      // Studio A availability
      { room_id: room1Id, day_of_week: 'monday', start_time: '09:00:00', end_time: '17:00:00', is_available: true },
      { room_id: room1Id, day_of_week: 'tuesday', start_time: '09:00:00', end_time: '17:00:00', is_available: true },
      { room_id: room1Id, day_of_week: 'wednesday', start_time: '09:00:00', end_time: '17:00:00', is_available: true },
      // Studio B availability
      { room_id: room2Id, day_of_week: 'monday', start_time: '10:00:00', end_time: '18:00:00', is_available: true },
      { room_id: room2Id, day_of_week: 'thursday', start_time: '10:00:00', end_time: '18:00:00', is_available: true },
      { room_id: room2Id, day_of_week: 'friday', start_time: '10:00:00', end_time: '18:00:00', is_available: true }
    ];

    for (const availability of roomAvailability) {
      const { error } = await supabase
        .from('room_availability')
        .insert(availability);

      if (error) console.error('Error creating room availability:', error);
      else console.log(`✓ Created availability for ${availability.room_id} on ${availability.day_of_week}`);
    }

    // 4. Create courses
    console.log('\n📚 Creating courses...');
    const courses = [
      {
        id: course1Id,
        title: 'Guitar Beginner',
        description: 'Learn guitar from basics',
        instructor_id: instructor1Id,
        max_students: 5,
        price: 500000,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: course2Id,
        title: 'Piano Intermediate',
        description: 'Intermediate piano lessons',
        instructor_id: instructor1Id,
        max_students: 3,
        price: 750000,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const course of courses) {
      const { error } = await supabase
        .from('courses')
        .upsert(course, { onConflict: 'id' });

      if (error) console.error('Error creating course:', error);
      else console.log(`✓ Created course: ${course.title}`);
    }

    // 5. Create class schedules (some available, some booked)
    console.log('\n📋 Creating class schedules...');
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(now);
    dayAfter.setDate(dayAfter.getDate() + 2);

    const schedules = [
      // Available schedules (booking_id = null)
      {
        id: schedule1Id,
        course_id: course1Id,
        instructor_id: instructor1Id,
        room_id: room1Id,
        start_time: `${tomorrow.toISOString().split('T')[0]}T10:00:00Z`,
        end_time: `${tomorrow.toISOString().split('T')[0]}T11:00:00Z`,
        booking_id: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: schedule2Id,
        course_id: course1Id,
        instructor_id: instructor1Id,
        room_id: room1Id,
        start_time: `${dayAfter.toISOString().split('T')[0]}T14:00:00Z`,
        end_time: `${dayAfter.toISOString().split('T')[0]}T15:00:00Z`,
        booking_id: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: schedule3Id,
        course_id: course2Id,
        instructor_id: instructor1Id,
        room_id: room2Id,
        start_time: `${tomorrow.toISOString().split('T')[0]}T15:00:00Z`,
        end_time: `${tomorrow.toISOString().split('T')[0]}T16:00:00Z`,
        booking_id: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      }
    ];

    for (const schedule of schedules) {
      const { error } = await supabase
        .from('class_schedules')
        .upsert(schedule, { onConflict: 'id' });

      if (error) console.error('Error creating schedule:', error);
      else console.log(`✓ Created schedule: ${schedule.id} (${schedule.booking_id ? 'booked' : 'available'})`);
    }

    // 6. Create bookings for some schedules
    console.log('\n📝 Creating bookings...');
    const bookings = [
      {
        id: booking1Id,
        user_id: 'user-001',
        course_id: course1Id,
        status: 'confirmed',
        experience_level: 'beginner',
        preferred_days: ['monday', 'wednesday'],
        preferred_time_range: { start: '10:00', end: '11:00' },
        start_date_target: tomorrow.toISOString().split('T')[0],
        guardian_name: 'Parent Name',
        guardian_wa_number: '+6281234567890',
        instrument_owned: false,
        notes: 'Eager student',
        referral_source: 'website',
        applicant_full_name: 'Student One',
        applicant_email: 'student1@test.com',
        applicant_wa_number: '+6281234567890',
        applicant_address: 'Jakarta',
        applicant_birth_place: 'Jakarta',
        applicant_birth_date: '2010-01-01',
        applicant_school: 'Test School',
        applicant_class: 5, // Changed to integer
        confirmed_slot_id: schedule1Id,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    for (const booking of bookings) {
      const { error } = await supabase
        .from('bookings')
        .upsert(booking, { onConflict: 'id' });

      if (error) console.error('Error creating booking:', error);
      else console.log(`✓ Created booking: ${booking.id} (${booking.status})`);
    }

    // 7. Update schedule with booking_id
    console.log('\n🔗 Linking booking to schedule...');
    const { error: updateError } = await supabase
      .from('class_schedules')
      .update({ booking_id: booking1Id, updated_at: now.toISOString() })
      .eq('id', schedule1Id);

    if (updateError) console.error('Error linking booking to schedule:', updateError);
    else console.log('✓ Linked booking to schedule');

    console.log('\n✅ Data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- 2 instructors created');
    console.log('- 2 rooms created');
    console.log('- Room availability created');
    console.log('- 2 courses created');
    console.log('- 3 schedules created (1 booked, 2 available)');
    console.log('- 1 booking created');

  } catch (error) {
    console.error('❌ Seeding error:', error);
  }
}

seedData();