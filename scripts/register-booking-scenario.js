/**
 * Complete Booking Registration Scenario Script
 * 
 * Script ini mensimulasikan skenario lengkap pendaftaran booking kursus musik
 * dari sisi calon siswa (tanpa login).
 * 
 * Flow:
 * 1. Fetch daftar course yang tersedia
 * 2. Fetch daftar instruktur yang tersedia
 * 3. Fetch jadwal yang tersedia (dari database)
 * 4. Validasi jadwal pilihan
 * 5. Submit pendaftaran booking lengkap
 * 
 * Usage:
 * node scripts/register-booking-scenario.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

// Configuration
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xlrwvzwpecprhgzfcqxw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhscnd2endwZWNwcmhnemZjcXh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTkxMzQwNCwiZXhwIjoyMDc1NDg5NDA0fQ.30-63oLLTrNhN0meFH3Zn5_oTOQ8KBbbHxgj_4ECDp4';

// Note: API Gateway routes without /api prefix (app.route('/', routes))
// So the actual URL is /booking/register-course NOT /api/booking/register-course

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper function to generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper function for formatted logging
function log(emoji, message, data = null) {
  console.log(`${emoji} ${message}`);
  if (data) {
    console.log('   ', JSON.stringify(data, null, 2).split('\n').join('\n    '));
  }
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  console.log(`📌 ${title}`);
  console.log('='.repeat(70));
}

function logStep(step, title) {
  console.log(`\n${step} ${title}`);
  console.log('-'.repeat(50));
}

// ============================================================================
// STEP 1: Fetch available courses from API
// ============================================================================
async function fetchAvailableCourses() {
  logStep('1️⃣', 'Mengambil daftar course yang tersedia...');
  
  try {
    const response = await fetch(`${API_GATEWAY_URL}/courses`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      // Fallback: Query directly from database if API fails
      log('⚠️', `API /api/courses gagal (${response.status}), mencoba query langsung ke database...`);
      return await fetchCoursesFromDatabase();
    }

    const data = await response.json();
    
    if (!data.success || !data.data?.courses?.length) {
      log('⚠️', 'API berhasil tapi tidak ada courses, mencoba query langsung ke database...');
      return await fetchCoursesFromDatabase();
    }

    log('✅', `Berhasil fetch ${data.data.courses.length} courses dari API`);
    return data.data.courses;

  } catch (error) {
    log('⚠️', `Error fetching from API: ${error.message}, fallback ke database...`);
    return await fetchCoursesFromDatabase();
  }
}

async function fetchCoursesFromDatabase() {
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, description, level, price_per_session, is_active, created_at')
    .eq('is_active', true)
    .limit(20);

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  log('✅', `Berhasil fetch ${courses.length} courses dari database`);
  return courses;
}

// ============================================================================
// STEP 2: Fetch available instructors from API
// ============================================================================
async function fetchAvailableInstructors() {
  logStep('2️⃣', 'Mengambil daftar instruktur yang tersedia...');
  
  try {
    const response = await fetch(`${API_GATEWAY_URL}/booking/available-instructors`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      log('⚠️', `API gagal (${response.status}), mencoba query langsung ke database...`);
      return await fetchInstructorsFromDatabase();
    }

    const data = await response.json();
    
    if (!data.success || !data.data?.instructors?.length) {
      log('⚠️', 'API berhasil tapi tidak ada instructors, mencoba query langsung ke database...');
      return await fetchInstructorsFromDatabase();
    }

    log('✅', `Berhasil fetch ${data.data.instructors.length} instructors dari API`);
    return data.data.instructors;

  } catch (error) {
    log('⚠️', `Error fetching from API: ${error.message}, fallback ke database...`);
    return await fetchInstructorsFromDatabase();
  }
}

async function fetchInstructorsFromDatabase() {
  const { data: instructors, error } = await supabase
    .from('instructor_profiles')
    .select('user_id, full_name, specialization, bio, email, wa_number')
    .order('full_name', { ascending: true });

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  const formattedInstructors = instructors.map(instructor => ({
    id: instructor.user_id,
    name: instructor.full_name,
    specialization: instructor.specialization,
    bio: instructor.bio,
    email: instructor.email,
    wa_number: instructor.wa_number
  }));

  log('✅', `Berhasil fetch ${formattedInstructors.length} instructors dari database`);
  return formattedInstructors;
}

// ============================================================================
// STEP 3: Fetch available schedules from database
// ============================================================================
async function fetchAvailableSchedules() {
  logStep('3️⃣', 'Mengambil jadwal yang tersedia dari database...');
  
  // Get schedules that are NOT booked yet (booking_id IS NULL)
  const { data: schedules, error } = await supabase
    .from('class_schedules')
    .select(`
      id,
      instructor_id,
      room_id,
      start_time,
      end_time,
      booking_id,
      created_at
    `)
    .is('booking_id', null)
    .order('start_time', { ascending: true })
    .limit(50);

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  log('✅', `Berhasil fetch ${schedules.length} jadwal tersedia (belum di-booking)`);

  // Group schedules by day of week
  const schedulesByDay = {};
  const timeRanges = [];

  schedules.forEach(schedule => {
    if (!schedule.start_time) return;
    
    const date = new Date(schedule.start_time);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const startTime = date.toTimeString().slice(0, 5); // HH:MM
    const endTime = schedule.end_time ? new Date(schedule.end_time).toTimeString().slice(0, 5) : null;

    if (!schedulesByDay[dayName]) {
      schedulesByDay[dayName] = [];
    }
    schedulesByDay[dayName].push({
      id: schedule.id,
      start: startTime,
      end: endTime,
      instructor_id: schedule.instructor_id,
      room_id: schedule.room_id
    });

    timeRanges.push({ start: startTime, end: endTime });
  });

  return {
    schedules,
    schedulesByDay,
    timeRanges,
    availableDays: Object.keys(schedulesByDay)
  };
}

// ============================================================================
// STEP 4: Validate schedule preferences
// ============================================================================
function validateSchedulePreferences(availableScheduleData, preferredDays, preferredTimeRange) {
  logStep('4️⃣', 'Validasi jadwal pilihan siswa...');
  
  const { availableDays, schedulesByDay } = availableScheduleData;
  const validationResult = {
    isValid: true,
    warnings: [],
    suggestions: []
  };

  log('📋', 'Hari tersedia di database:', availableDays);
  log('📋', 'Hari yang dipilih siswa:', preferredDays);
  log('📋', 'Waktu yang dipilih siswa:', preferredTimeRange);

  // Check if preferred days match available days
  const matchingDays = preferredDays.filter(day => availableDays.includes(day.toLowerCase()));
  
  if (matchingDays.length === 0 && availableDays.length > 0) {
    validationResult.warnings.push(
      `Hari pilihan (${preferredDays.join(', ')}) tidak sesuai dengan jadwal tersedia (${availableDays.join(', ')})`
    );
    validationResult.suggestions.push(`Gunakan hari: ${availableDays.slice(0, 3).join(', ')}`);
  } else if (matchingDays.length > 0) {
    log('✅', `${matchingDays.length} hari cocok dengan jadwal tersedia: ${matchingDays.join(', ')}`);
  }

  // Check time range availability
  if (availableDays.length > 0) {
    const firstDay = availableDays[0];
    const daySchedules = schedulesByDay[firstDay] || [];
    
    if (daySchedules.length > 0) {
      const sampleTimes = daySchedules.slice(0, 3).map(s => `${s.start}-${s.end}`);
      log('📅', `Contoh jadwal tersedia di ${firstDay}:`, sampleTimes);
    }
  }

  if (validationResult.warnings.length > 0) {
    log('⚠️', 'Peringatan:', validationResult.warnings);
    log('💡', 'Saran:', validationResult.suggestions);
  } else {
    log('✅', 'Jadwal pilihan valid');
  }

  return validationResult;
}

// ============================================================================
// STEP 5: Submit booking registration
// ============================================================================
async function submitBookingRegistration(courseId, scheduleData, instructors, customData = {}) {
  logStep('5️⃣', 'Submit pendaftaran booking...');
  
  // Generate unique email for this test
  const uniqueId = Date.now();
  const uniqueEmail = `siswa.test.${uniqueId}@example.com`;

  // Determine preferred days based on available schedules
  let preferredDays = ['monday', 'wednesday', 'friday']; // Default
  if (scheduleData.availableDays.length > 0) {
    // Use actual available days from database
    preferredDays = scheduleData.availableDays.slice(0, 3);
  }

  // Determine time range based on available schedules
  let preferredTimeRange = { start: '14:00', end: '16:00' }; // Default
  if (scheduleData.timeRanges.length > 0) {
    const firstTime = scheduleData.timeRanges[0];
    if (firstTime.start && firstTime.end) {
      preferredTimeRange = {
        start: firstTime.start,
        end: firstTime.end
      };
    }
  }

  // Build slot preferences from available schedules
  let firstPreference = null;
  let secondPreference = null;
  let firstChoiceSlotId = null;
  let secondChoiceSlotId = null;

  // Get first available slot for first preference
  if (scheduleData.schedules.length > 0) {
    const firstSlot = scheduleData.schedules[0];
    const firstDate = new Date(firstSlot.start_time);
    const firstDayName = firstDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const firstStartTime = firstDate.toTimeString().slice(0, 5);
    const firstEndTime = firstSlot.end_time ? new Date(firstSlot.end_time).toTimeString().slice(0, 5) : '00:00';

    firstChoiceSlotId = firstSlot.id;
    firstPreference = {
      day: firstDayName,
      start_time: firstStartTime,
      end_time: firstEndTime,
      instructor_id: firstSlot.instructor_id,
      selected_at: new Date().toISOString()
    };

    log('📌', 'First Choice Slot:', {
      slot_id: firstChoiceSlotId,
      day: firstDayName,
      time: `${firstStartTime} - ${firstEndTime}`,
      instructor_id: firstSlot.instructor_id
    });
  }

  // Get second available slot for second preference (different from first)
  if (scheduleData.schedules.length > 1) {
    const secondSlot = scheduleData.schedules[1];
    const secondDate = new Date(secondSlot.start_time);
    const secondDayName = secondDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const secondStartTime = secondDate.toTimeString().slice(0, 5);
    const secondEndTime = secondSlot.end_time ? new Date(secondSlot.end_time).toTimeString().slice(0, 5) : '00:00';

    secondChoiceSlotId = secondSlot.id;
    secondPreference = {
      day: secondDayName,
      start_time: secondStartTime,
      end_time: secondEndTime,
      instructor_id: secondSlot.instructor_id,
      selected_at: new Date().toISOString()
    };

    log('📌', 'Second Choice Slot:', {
      slot_id: secondChoiceSlotId,
      day: secondDayName,
      time: `${secondStartTime} - ${secondEndTime}`,
      instructor_id: secondSlot.instructor_id
    });
  }

  // Complete registration data with ALL required fields
  const registrationData = {
    // === REQUIRED FIELDS ===
    full_name: customData.full_name || 'Budi Siswa Baru',
    email: customData.email || uniqueEmail,
    course_id: courseId,
    
    // Personal data (required)
    address: customData.address || 'Jl. Musik Indah No. 123, RT 01/RW 02, Kelurahan Harmoni, Kecamatan Melodi, Jakarta Selatan 12345',
    birth_place: customData.birth_place || 'Jakarta',
    birth_date: customData.birth_date || '2010-08-15', // Format: YYYY-MM-DD
    school: customData.school || 'SMP Negeri 1 Jakarta',
    class: customData.class || 8, // Kelas 8 (1-12)

    // Guardian data (required)
    guardian_name: customData.guardian_name || 'Ibu Siti Wali Murid',
    guardian_wa_number: customData.guardian_wa_number || '+6281234567890', // Must start with +62

    // Security fields (required)
    consent: true,
    captcha_token: 'test-captcha-token-' + uniqueId,
    idempotency_key: generateUUID(),

    // === OPTIONAL FIELDS (but filled for complete scenario) ===
    experience_level: customData.experience_level || 'beginner', // beginner, intermediate, advanced
    preferred_days: customData.preferred_days || preferredDays,
    preferred_time_range: customData.preferred_time_range || preferredTimeRange,
    start_date_target: customData.start_date_target || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks from now
    instrument_owned: customData.instrument_owned !== undefined ? customData.instrument_owned : false,
    notes: customData.notes || 'Saya tertarik belajar musik sejak kecil. Ingin mulai dari dasar dengan instruktur yang sabar.',
    referral_source: customData.referral_source || 'website', // instagram, facebook, google, tiktok, friend, website, other

    // === SLOT PREFERENCE FIELDS (filled with real data) ===
    first_preference: customData.first_preference || firstPreference,
    second_preference: customData.second_preference || secondPreference,
    first_choice_slot_id: customData.first_choice_slot_id || firstChoiceSlotId,
    second_choice_slot_id: customData.second_choice_slot_id || secondChoiceSlotId
  };

  log('📝', 'Data pendaftaran lengkap:');
  console.log('\n   --- Data Pribadi ---');
  console.log(`   Nama Lengkap     : ${registrationData.full_name}`);
  console.log(`   Email            : ${registrationData.email}`);
  console.log(`   Alamat           : ${registrationData.address}`);
  console.log(`   Tempat Lahir     : ${registrationData.birth_place}`);
  console.log(`   Tanggal Lahir    : ${registrationData.birth_date}`);
  console.log(`   Sekolah          : ${registrationData.school}`);
  console.log(`   Kelas            : ${registrationData.class}`);
  
  console.log('\n   --- Data Wali ---');
  console.log(`   Nama Wali        : ${registrationData.guardian_name}`);
  console.log(`   No. WA Wali      : ${registrationData.guardian_wa_number}`);
  
  console.log('\n   --- Preferensi Jadwal ---');
  console.log(`   Level Pengalaman : ${registrationData.experience_level}`);
  console.log(`   Hari Preferensi  : ${registrationData.preferred_days.join(', ')}`);
  console.log(`   Waktu Preferensi : ${registrationData.preferred_time_range.start} - ${registrationData.preferred_time_range.end}`);
  console.log(`   Target Mulai     : ${registrationData.start_date_target}`);
  console.log(`   Punya Instrumen  : ${registrationData.instrument_owned ? 'Ya' : 'Tidak'}`);

  console.log('\n   --- Pilihan Slot Jadwal ---');
  console.log(`   First Choice Slot ID    : ${registrationData.first_choice_slot_id || 'null'}`);
  console.log(`   Second Choice Slot ID   : ${registrationData.second_choice_slot_id || 'null'}`);
  if (registrationData.first_preference) {
    console.log(`   First Preference        : ${registrationData.first_preference.day} ${registrationData.first_preference.start_time}-${registrationData.first_preference.end_time}`);
  }
  if (registrationData.second_preference) {
    console.log(`   Second Preference       : ${registrationData.second_preference.day} ${registrationData.second_preference.start_time}-${registrationData.second_preference.end_time}`);
  }
  
  console.log('\n   --- Tambahan ---');
  console.log(`   Catatan          : ${registrationData.notes}`);
  console.log(`   Sumber Referral  : ${registrationData.referral_source}`);

  // Submit to API
  log('🚀', 'Mengirim request ke /booking/register-course...');

  try {
    const response = await fetch(`${API_GATEWAY_URL}/booking/register-course`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData)
    });

    const responseData = await response.json();

    if (!response.ok) {
      log('❌', `Pendaftaran GAGAL (Status: ${response.status})`);
      log('❌', 'Error:', responseData.error);
      
      if (responseData.error?.details) {
        console.log('\n   Validation Details:');
        responseData.error.details.forEach((detail, idx) => {
          console.log(`   ${idx + 1}. Path: ${detail.path?.join('.')} - ${detail.message}`);
        });
      }
      
      return { success: false, error: responseData.error, registrationData };
    }

    log('✅', 'Pendaftaran BERHASIL!');
    
    const booking = responseData.data.booking;
    console.log('\n   --- Hasil Booking ---');
    console.log(`   Booking ID       : ${booking.id}`);
    console.log(`   Status           : ${booking.status}`);
    console.log(`   Course ID        : ${booking.course_id}`);
    console.log(`   Nama Pendaftar   : ${booking.applicant_full_name}`);
    console.log(`   Email            : ${booking.applicant_email}`);
    console.log(`   First Choice Slot: ${booking.first_choice_slot_id || 'N/A'}`);
    console.log(`   Second Choice Slot: ${booking.second_choice_slot_id || 'N/A'}`);
    if (booking.first_preference) {
      console.log(`   First Preference : ${JSON.stringify(booking.first_preference)}`);
    }
    if (booking.second_preference) {
      console.log(`   Second Preference: ${JSON.stringify(booking.second_preference)}`);
    }
    console.log(`   Dibuat           : ${new Date(booking.created_at).toLocaleString('id-ID')}`);
    console.log(`   Expired          : ${new Date(booking.expires_at).toLocaleString('id-ID')}`);

    return { 
      success: true, 
      booking, 
      registrationData,
      response: responseData 
    };

  } catch (error) {
    log('❌', `Request error: ${error.message}`);
    return { success: false, error: error.message, registrationData };
  }
}

// ============================================================================
// MAIN: Run complete scenario
// ============================================================================
async function runCompleteBookingScenario() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║     🎵 SKENARIO LENGKAP: PENDAFTARAN BOOKING KURSUS MUSIK 🎵        ║');
  console.log('║                  (Dari Sisi Calon Siswa - Tanpa Login)              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('\n📅 Waktu Eksekusi:', new Date().toLocaleString('id-ID'));
  console.log('🔗 API Gateway:', API_GATEWAY_URL);
  console.log('🗄️  Database:', SUPABASE_URL);

  try {
    // ========== STEP 1: Get available courses ==========
    const courses = await fetchAvailableCourses();
    
    if (!courses || courses.length === 0) {
      throw new Error('Tidak ada course tersedia di database');
    }

    console.log('\n📚 Daftar Course Tersedia:');
    courses.forEach((course, idx) => {
      console.log(`   ${idx + 1}. ${course.title || 'Untitled'}`);
      console.log(`      ID: ${course.id}`);
      console.log(`      Level: ${course.level || 'N/A'}`);
      console.log(`      Harga/Session: Rp ${course.price_per_session?.toLocaleString('id-ID') || 'N/A'}`);
    });

    // Select first active course
    const selectedCourse = courses[0];
    log('\n🎯', `Course yang dipilih: ${selectedCourse.title || selectedCourse.id}`);

    // ========== STEP 2: Get available instructors ==========
    const instructors = await fetchAvailableInstructors();
    
    if (instructors && instructors.length > 0) {
      console.log('\n👨‍🏫 Daftar Instruktur Tersedia:');
      instructors.forEach((instructor, idx) => {
        console.log(`   ${idx + 1}. ${instructor.name || 'N/A'}`);
        console.log(`      Spesialisasi: ${instructor.specialization || 'N/A'}`);
      });
    } else {
      log('ℹ️', 'Tidak ada instruktur tersedia');
    }

    // ========== STEP 3: Get available schedules ==========
    const scheduleData = await fetchAvailableSchedules();
    
    if (scheduleData.availableDays.length > 0) {
      console.log('\n📅 Ringkasan Jadwal Tersedia:');
      console.log(`   Total slot tersedia: ${scheduleData.schedules.length}`);
      console.log(`   Hari tersedia: ${scheduleData.availableDays.join(', ')}`);
      
      Object.keys(scheduleData.schedulesByDay).forEach(day => {
        const slots = scheduleData.schedulesByDay[day];
        console.log(`   ${day}: ${slots.length} slot`);
      });
    } else {
      log('ℹ️', 'Tidak ada jadwal slot tersedia di database');
      log('💡', 'Akan menggunakan preferensi default untuk pendaftaran');
    }

    // ========== STEP 4: Validate preferences ==========
    const defaultPreferredDays = scheduleData.availableDays.length > 0 
      ? scheduleData.availableDays.slice(0, 3) 
      : ['monday', 'wednesday', 'friday'];
    
    const defaultTimeRange = scheduleData.timeRanges.length > 0 && scheduleData.timeRanges[0].start
      ? scheduleData.timeRanges[0]
      : { start: '14:00', end: '16:00' };

    validateSchedulePreferences(
      scheduleData,
      defaultPreferredDays,
      defaultTimeRange
    );

    // ========== STEP 5: Submit registration ==========
    const result = await submitBookingRegistration(
      selectedCourse.id,
      scheduleData,
      instructors
    );

    // ========== SUMMARY ==========
    logSection('RINGKASAN SKENARIO');
    
    if (result.success) {
      console.log('\n✅ SKENARIO BERHASIL DIJALANKAN!\n');
      console.log('   📋 Detail:');
      console.log(`   - Course yang dipilih  : ${selectedCourse.title || selectedCourse.id}`);
      console.log(`   - Booking ID           : ${result.booking.id}`);
      console.log(`   - Status               : ${result.booking.status}`);
      console.log(`   - Nama Pendaftar       : ${result.registrationData.full_name}`);
      console.log(`   - Email                : ${result.registrationData.email}`);
      console.log(`   - Jadwal Preferensi    : ${result.registrationData.preferred_days.join(', ')}`);
      console.log(`   - Waktu Preferensi     : ${result.registrationData.preferred_time_range.start} - ${result.registrationData.preferred_time_range.end}`);
      if (result.booking.first_choice_slot_id) {
        console.log(`   - First Choice Slot ID : ${result.booking.first_choice_slot_id}`);
      }
      if (result.booking.second_choice_slot_id) {
        console.log(`   - Second Choice Slot ID: ${result.booking.second_choice_slot_id}`);
      }
      
      console.log('\n   📌 Next Steps:');
      console.log(`   1. Admin dapat melihat booking pending di: /api/booking/admin/bookings/pending`);
      console.log(`   2. Admin dapat konfirmasi booking di: POST /api/booking/${result.booking.id}/confirm`);
      console.log(`   3. Booking akan expired pada: ${new Date(result.booking.expires_at).toLocaleString('id-ID')}`);
      console.log(`   4. Event Kafka 'booking.created' telah dipublish`);
      
    } else {
      console.log('\n❌ SKENARIO GAGAL!\n');
      console.log('   Error:', result.error);
    }

    console.log('\n' + '='.repeat(70));
    console.log('🏁 Eksekusi selesai pada:', new Date().toLocaleString('id-ID'));
    console.log('='.repeat(70) + '\n');

    return result;

  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// ============================================================================
// EXPORT & RUN
// ============================================================================
if (require.main === module) {
  runCompleteBookingScenario()
    .then((result) => {
      process.exit(result?.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = {
  runCompleteBookingScenario,
  fetchAvailableCourses,
  fetchAvailableInstructors,
  fetchAvailableSchedules,
  validateSchedulePreferences,
  submitBookingRegistration
};
