/**
 * Script untuk populate tabel kosong dengan data sample
 * Mengisi: rooms, instructor_profiles, class_schedules, enrollments, schedule_attendees
 *
 * Usage:
 * node scripts/populate-database.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xlrwvzwpecprhgzfcqxw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function populateRooms() {
  console.log('\n🏢 Populating rooms table...');

  // Check if rooms already exist
  const { data: existingRooms, error: checkError } = await supabase
    .from('rooms')
    .select('name')
    .limit(1);

  if (checkError) {
    console.error('❌ Error checking existing rooms:', checkError);
    throw checkError;
  }

  if (existingRooms && existingRooms.length > 0) {
    console.log('ℹ️ Rooms already populated, skipping...');
    return existingRooms;
  }

  const rooms = [
    {
      name: 'Piano Room 1',
      capacity: 1,
      description: 'Ground Floor, Room 101 - Dedicated piano practice room',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      name: 'Piano Room 2',
      capacity: 1,
      description: 'Ground Floor, Room 102 - Piano practice room with recording equipment',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      name: 'Guitar Room',
      capacity: 1,
      description: 'First Floor, Room 201 - Acoustic and electric guitar practice room',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      name: 'Drum Room',
      capacity: 1,
      description: 'First Floor, Room 202 - Full drum kit practice room with soundproofing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      name: 'Group Practice Room',
      capacity: 4,
      description: 'Second Floor, Room 301 - Large room for group practice and ensemble sessions',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  const { data, error } = await supabase
    .from('rooms')
    .insert(rooms)
    .select();

  if (error) {
    console.error('❌ Error populating rooms:', error);
    throw error;
  }

  console.log(`✅ Inserted ${data.length} rooms`);
  return data;
}

async function populateInstructorProfiles() {
  console.log('\n👨‍🏫 Populating instructor_profiles table...');

  // Check if instructor profiles already exist
  const { data: existingProfiles, error: checkError } = await supabase
    .from('instructor_profiles')
    .select('user_id')
    .limit(1);

  if (checkError) {
    console.error('❌ Error checking existing instructor profiles:', checkError);
    throw checkError;
  }

  if (existingProfiles && existingProfiles.length > 0) {
    console.log('ℹ️ Instructor profiles already populated, skipping...');
    return existingProfiles;
  }

  // Get existing instructor users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('role', 'instructor')
    .limit(3);

  if (usersError || !users || users.length === 0) {
    console.error('❌ No instructor users found for profiles');
    throw new Error('No instructor users available');
  }

  const instructors = users.map((user, index) => ({
    user_id: user.id,
    bio: `Professional music instructor with extensive experience. Specializes in various instruments and teaching methodologies.`,
    specialization: ['Piano', 'Guitar', 'Drums'][index % 3],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('instructor_profiles')
    .insert(instructors)
    .select();

  if (error) {
    console.error('❌ Error populating instructor_profiles:', error);
    throw error;
  }

  console.log(`✅ Inserted ${data.length} instructor profiles`);
  return data;
}

async function populateClassSchedules(instructors, rooms) {
  console.log('\n📅 Populating class_schedules table...');

  // Check if class schedules already exist
  const { data: existingSchedules, error: checkError } = await supabase
    .from('class_schedules')
    .select('id')
    .limit(1);

  if (checkError) {
    console.error('❌ Error checking existing class schedules:', checkError);
    throw checkError;
  }

  if (existingSchedules && existingSchedules.length > 0) {
    console.log('ℹ️ Class schedules already populated, skipping...');
    return existingSchedules;
  }

  // Get existing courses
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, title')
    .eq('is_active', true)
    .limit(2);

  if (coursesError || !courses || courses.length === 0) {
    console.error('❌ No active courses found');
    throw new Error('No active courses available');
  }

  const schedules = [];
  const now = new Date();

  // Create schedules for next 2 weeks
  for (let week = 0; week < 2; week++) {
    for (let day = 1; day <= 7; day++) {
      if (day === 1 || day === 7) continue; // Skip Sunday and Saturday for this example

      const scheduleDate = new Date(now);
      scheduleDate.setDate(now.getDate() + week * 7 + day);

      // Morning session
      schedules.push({
        course_id: courses[0].id,
        instructor_id: instructors[0].user_id,
        room_id: rooms[0].id,
        start_time: new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate(), 9, 0, 0).toISOString(),
        end_time: new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate(), 10, 30, 0).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Afternoon session
      schedules.push({
        course_id: courses[1]?.id || courses[0].id,
        instructor_id: instructors[1]?.user_id || instructors[0].user_id,
        room_id: rooms[1].id,
        start_time: new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate(), 14, 0, 0).toISOString(),
        end_time: new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate(), 15, 30, 0).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }

  const { data, error } = await supabase
    .from('class_schedules')
    .insert(schedules)
    .select();

  if (error) {
    console.error('❌ Error populating class_schedules:', error);
    throw error;
  }

  console.log(`✅ Inserted ${data.length} class schedules`);
  return data;
}

async function populateEnrollments() {
  console.log('\n📝 Populating enrollments table...');

  // Check if enrollments already exist
  const { data: existingEnrollments, error: checkError } = await supabase
    .from('enrollments')
    .select('id')
    .limit(1);

  if (checkError) {
    console.error('❌ Error checking existing enrollments:', checkError);
    throw checkError;
  }

  if (existingEnrollments && existingEnrollments.length > 0) {
    console.log('ℹ️ Enrollments already populated, skipping...');
    return existingEnrollments;
  }

  // Get confirmed bookings
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, course_id, status')
    .eq('status', 'confirmed')
    .limit(5);

  if (bookingsError || !bookings) {
    console.log('⚠️ No confirmed bookings found, skipping enrollments');
    return [];
  }

  const enrollments = bookings.map(booking => ({
    booking_id: booking.id,
    course_id: booking.course_id,
    status: 'active',
    registration_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('enrollments')
    .insert(enrollments)
    .select();

  if (error) {
    console.error('❌ Error populating enrollments:', error);
    throw error;
  }

  console.log(`✅ Inserted ${data.length} enrollments`);
  return data;
}

async function populateScheduleAttendees(schedules, enrollments) {
  console.log('\n👥 Populating schedule_attendees table...');

  // Check if schedule attendees already exist
  const { data: existingAttendees, error: checkError } = await supabase
    .from('schedule_attendees')
    .select('class_schedule_id')
    .limit(1);

  if (checkError) {
    console.error('❌ Error checking existing schedule attendees:', checkError);
    throw checkError;
  }

  if (existingAttendees && existingAttendees.length > 0) {
    console.log('ℹ️ Schedule attendees already populated, skipping...');
    return existingAttendees;
  }

  if (!schedules || schedules.length === 0 || !enrollments || enrollments.length === 0) {
    console.log('⚠️ No schedules or enrollments available, skipping attendees');
    return [];
  }

  const attendees = [];

  // Create attendance for past schedules
  const pastSchedules = schedules.filter(schedule =>
    new Date(schedule.start_time) < new Date()
  );

  pastSchedules.forEach(schedule => {
    enrollments.slice(0, 2).forEach(enrollment => { // Max 2 attendees per schedule
      attendees.push({
        class_schedule_id: schedule.id,
        booking_id: enrollment.booking_id, // Use booking_id from enrollment
        attended: Math.random() > 0.2, // 80% attendance rate
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });
  });

  if (attendees.length === 0) {
    console.log('⚠️ No past schedules to create attendance for');
    return [];
  }

  const { data, error } = await supabase
    .from('schedule_attendees')
    .insert(attendees)
    .select();

  if (error) {
    console.error('❌ Error populating schedule_attendees:', error);
    throw error;
  }

  console.log(`✅ Inserted ${data.length} schedule attendees`);
  return data;
}

async function main() {
  console.log('🚀 Starting database population...');
  console.log(`📡 Connected to: ${SUPABASE_URL}`);

  try {
    // Populate in order of dependencies
    const rooms = await populateRooms();
    const instructors = await populateInstructorProfiles();
    const schedules = await populateClassSchedules(instructors, rooms);
    const enrollments = await populateEnrollments();
    const attendees = await populateScheduleAttendees(schedules, enrollments);

    console.log('\n🎉 Database population completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Rooms: ${rooms.length}`);
    console.log(`   Instructor Profiles: ${instructors.length}`);
    console.log(`   Class Schedules: ${schedules.length}`);
    console.log(`   Enrollments: ${enrollments.length}`);
    console.log(`   Schedule Attendees: ${attendees.length}`);

  } catch (error) {
    console.error('\n❌ Database population failed:', error.message);
    process.exit(1);
  }

  console.log('\n✅ Done!\n');
}

// Run
main();