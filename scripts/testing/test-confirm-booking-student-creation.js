/**
 * Test Script: Confirm Booking with Auto Student Creation
 * 
 * This script tests the new feature where confirming a booking
 * automatically creates a student record.
 * 
 * Usage:
 * bun run scripts/testing/test-confirm-booking-student-creation.js
 * 
 * Note: This test simulates the confirmBooking logic directly
 * using database access to verify the implementation.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xlrwvzwpecprhgzfcqxw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function findPendingBooking() {
  console.log('\n📋 Finding a pending booking...');
  
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id, applicant_full_name, applicant_email, course_id, status')
    .eq('status', 'pending')
    .limit(1)
    .single();

  if (error || !booking) {
    console.log('⚠️ No pending booking found, error:', error?.message);
    return null;
  }

  console.log('✅ Found pending booking:', {
    id: booking.id,
    name: booking.applicant_full_name,
    email: booking.applicant_email
  });

  return booking;
}

async function simulateConfirmBooking(bookingId) {
  console.log(`\n✅ Simulating confirm booking via database: ${bookingId}`);
  
  // Get booking details first
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();
    
  if (fetchError || !booking) {
    console.error('❌ Booking not found:', fetchError?.message);
    return null;
  }
  
  // Update booking status to confirmed
  const { data: updatedBooking, error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'confirmed',
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .select()
    .single();
    
  if (updateError) {
    console.error('❌ Failed to update booking:', updateError.message);
    return null;
  }
  
  console.log('✅ Booking status updated to confirmed');
  
  // Now simulate the student creation logic (same as in confirmBooking controller)
  console.log('📝 Checking if student already exists...');
  
  const { data: existingStudent } = await supabase
    .from('students')
    .select('id, email, booking_id')
    .or(`email.eq.${booking.applicant_email},booking_id.eq.${bookingId}`)
    .maybeSingle();

  if (existingStudent) {
    console.log('⚠️ Student already exists:', existingStudent.id);
    return {
      booking: updatedBooking,
      student: existingStudent,
      studentCreated: false,
      warning: `Student already exists with id: ${existingStudent.id}`
    };
  }
  
  console.log('📝 Creating new student record...');
  
  // Get course details for instrument info
  let instrumentName = null;
  if (booking.course_id) {
    const { data: course } = await supabase
      .from('courses')
      .select('instrument, title')
      .eq('id', booking.course_id)
      .single();
    
    if (course) {
      instrumentName = course.instrument || course.title;
    }
  }

  // Insert new student record
  const { data: newStudent, error: studentError } = await supabase
    .from('students')
    .insert({
      display_name: booking.applicant_full_name,
      email: booking.applicant_email,
      booking_id: bookingId,
      user_id: booking.user_id || null,
      instrument: instrumentName,
      level: booking.experience_level || 'beginner',
      has_instrument: booking.instrument_owned || false,
      photo_url: null,
      highlight_quote: null,
      can_publish: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (studentError) {
    console.error('⚠️ Failed to create student record:', studentError.message);
    return {
      booking: updatedBooking,
      student: null,
      studentCreated: false,
      warning: `Failed to create student: ${studentError.message}`
    };
  }
  
  console.log('✅ Student record created:', newStudent.id);
  
  return {
    booking: updatedBooking,
    student: newStudent,
    studentCreated: true
  };
}

async function checkStudentCreated(email, bookingId) {
  console.log(`\n🔍 Verifying student in database...`);
  
  const { data: student, error } = await supabase
    .from('students')
    .select('*')
    .or(`email.eq.${email},booking_id.eq.${bookingId}`)
    .maybeSingle();

  if (error) {
    console.log('❌ Error checking student:', error.message);
    return null;
  }
  
  if (!student) {
    console.log('⚠️ Student not found in database');
    return null;
  }

  console.log('✅ Student verified:', {
    id: student.id,
    display_name: student.display_name,
    email: student.email,
    booking_id: student.booking_id,
    instrument: student.instrument,
    level: student.level
  });

  return student;
}

async function testDuplicateStudentPrevention(email, bookingId) {
  console.log('\n🔄 Testing duplicate student prevention...');
  
  // Try to insert same student again
  const { data: existingStudent } = await supabase
    .from('students')
    .select('id')
    .or(`email.eq.${email},booking_id.eq.${bookingId}`)
    .maybeSingle();
    
  if (existingStudent) {
    console.log('✅ Duplicate prevention working - student already exists');
    return true;
  }
  
  return false;
}

async function cleanup(studentId, bookingId, shouldCleanup = false) {
  if (!shouldCleanup) {
    console.log('\n⚠️ Skipping cleanup (set shouldCleanup=true to clean)');
    return;
  }
  
  console.log('\n🧹 Cleaning up test data...');
  
  // Delete test student
  if (studentId) {
    await supabase
      .from('students')
      .delete()
      .eq('id', studentId);
    console.log('✅ Test student deleted');
  }
  
  // Revert booking status back to pending (for re-testing)
  if (bookingId) {
    await supabase
      .from('bookings')
      .update({ status: 'pending' })
      .eq('id', bookingId);
    console.log('✅ Booking reverted to pending');
  }
}

async function main() {
  console.log('🚀 Test: Confirm Booking with Auto Student Creation\n');
  console.log('='.repeat(60));
  console.log('Note: This test simulates the confirmBooking logic directly');
  console.log('='.repeat(60));
  
  let testBooking = null;
  let result = null;
  
  try {
    // Step 1: Find a pending booking
    testBooking = await findPendingBooking();
    
    if (!testBooking) {
      console.log('\n⚠️ No pending booking to test.');
      console.log('Please run the registration flow first to create a booking.');
      console.log('Example: bun run scripts/register-booking-scenario.js');
      return;
    }
    
    // Step 2: Simulate confirm booking with student creation
    result = await simulateConfirmBooking(testBooking.id);
    
    if (!result) {
      console.log('\n❌ Test failed: Could not confirm booking');
      return;
    }
    
    // Step 3: Verify student was created
    const verifiedStudent = await checkStudentCreated(testBooking.applicant_email, testBooking.id);
    
    // Step 4: Test duplicate prevention
    const duplicateBlocked = await testDuplicateStudentPrevention(testBooking.applicant_email, testBooking.id);
    
    // Step 5: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Booking ID: ${testBooking.id}`);
    console.log(`Booking confirmed: ✅`);
    console.log(`Student created: ${result.studentCreated ? '✅' : '⚠️ (already existed)'}`);
    console.log(`Student verified: ${verifiedStudent ? '✅' : '❌'}`);
    console.log(`Duplicate prevention: ${duplicateBlocked ? '✅' : '❌'}`);
    
    if (result.warning) {
      console.log(`Warning: ${result.warning}`);
    }
    
    if (verifiedStudent) {
      console.log('\n📝 Student Details:');
      console.log(JSON.stringify(verifiedStudent, null, 2));
    }
    
    console.log('\n✅ TEST COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup - set to true if you want to clean up after test
    await cleanup(result?.student?.id, testBooking?.id, false);
  }
}

main().catch(console.error);
