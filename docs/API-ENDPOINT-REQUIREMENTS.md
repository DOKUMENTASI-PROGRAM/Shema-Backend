# API Endpoint Requirements Documentation

## Overview

This document outlines the requirements for all endpoints in the Shema Music Backend system. The system consists of multiple microservices including Authentication, Booking, Course, Admin, and Recommendation services, all routed through an API Gateway.

## Authentication Service Endpoints

### Standard Authentication

#### POST /auth/register
- **Purpose**: Register new admin users
- **Access Level**: Public
- **Required Fields**:
  - Email (valid email format)
  - Password (minimum 8 characters with strength validation)
  - Full Name (minimum 2 characters)
  - Role (must be 'admin')
  - Phone Number (optional)
  - Preferred Instruments (optional array)
  - Experience Level (optional)
  - Learning Goal (optional)
- **Validation**: Password strength validation, email format validation
- **Response**: User data with access and refresh tokens
- **Error Handling**: Duplicate email detection, validation errors

#### POST /auth/login
- **Purpose**: Authenticate admin users
- **Access Level**: Public
- **Required Fields**:
  - Email (valid email format)
  - Password
- **Process**: Verify credentials against Supabase Auth
- **Response**: User data with access and refresh tokens
- **Features**: Updates last login timestamp
- **Error Handling**: Invalid credentials detection

#### POST /auth/refresh
- **Purpose**: Refresh access token using refresh token
- **Access Level**: Public
- **Required Fields**:
  - Refresh Token
- **Process**: Validates refresh token, generates new access token
- **Security**: Checks refresh token existence in Redis
- **Error Handling**: Invalid/expired token detection

#### POST /auth/logout
- **Purpose**: Logout user by invalidating refresh token
- **Access Level**: Public (but requires valid refresh token)
- **Required Fields**:
  - Refresh Token
- **Process**: Removes refresh token from Redis
- **Security**: Token invalidation

#### GET /auth/me
- **Purpose**: Get current authenticated user information
- **Access Level**: Protected (requires authentication)
- **Authentication**: JWT token required
- **Response**: User profile data
- **Error Handling**: Unauthenticated access detection

### Firebase Authentication

#### POST /auth/firebase/register
- **Purpose**: Register admin users via Firebase
- **Access Level**: Public
- **Required Fields**:
  - Email (valid email format)
  - Password (minimum 8 characters)
  - Full Name (minimum 2 characters)
  - Phone Number (optional)
- **Process**: Creates Firebase user and stores in Supabase
- **Features**: Email verification required
- **Error Handling**: Duplicate email detection

#### POST /auth/firebase/login
- **Purpose**: Login with Firebase ID token
- **Access Level**: Public
- **Required Fields**:
  - Firebase ID Token
- **Process**: Verifies Firebase token, checks/creates user in Supabase
- **Features**: Automatic user creation if not exists
- **Security**: Firebase token verification

#### POST /auth/firebase/reset-password
- **Purpose**: Request password reset link
- **Access Level**: Public
- **Required Fields**:
  - Email (valid email format)
- **Process**: Generates password reset link via Firebase
- **Security**: Doesn't reveal if email exists
- **Features**: Email delivery of reset link

## Course Service Endpoints

#### GET /courses
- **Purpose**: Retrieve all courses with optional filtering
- **Access Level**: Public
- **Optional Query Parameters**:
  - Search (filters by title and description)
  - Instructor ID (filters by instructor)
- **Response**: Array of courses with pagination data
- **Features**: Basic search and filtering capabilities

#### GET /courses/:id
- **Purpose**: Retrieve specific course by ID
- **Access Level**: Public
- **Required Parameters**:
  - Course ID (UUID format)
- **Response**: Detailed course information
- **Error Handling**: Course not found detection

#### POST /courses
- **Purpose**: Create new course
- **Access Level**: Protected (admin/instructor only)
- **Authentication**: JWT token with admin/instructor role required
- **Status**: Not yet implemented
- **Future Requirements**: Course creation validation

#### PUT /courses/:id
- **Purpose**: Update existing course
- **Access Level**: Protected (admin/instructor only)
- **Authentication**: JWT token with admin/instructor role required
- **Required Parameters**:
  - Course ID (UUID format)
- **Status**: Not yet implemented
- **Future Requirements**: Course update validation

#### DELETE /courses/:id
- **Purpose**: Delete course
- **Access Level**: Protected (admin/instructor only)
- **Authentication**: JWT token with admin/instructor role required
- **Required Parameters**:
  - Course ID (UUID format)
- **Status**: Not yet implemented
- **Future Requirements**: Course deletion validation

## Booking Service Endpoints

### Public Endpoints

#### POST /booking/register-course
- **Purpose**: Register for a course (creates student account if needed)
- **Access Level**: Public
- **Required Fields**:
  - Personal Information (Full Name, WA Number, Email)
  - Course ID (UUID format)
  - Experience Level (beginner/intermediate/advanced)
  - Preferred Days (array, minimum 1)
  - Preferred Time Range (start and end time in HH:MM format)
  - Guardian Information (optional, for minors)
  - Instrument Ownership (optional)
  - Notes (optional)
  - Referral Source (optional)
  - Consent (required, boolean)
  - Captcha Token (required)
  - Idempotency Key (UUID format)
- **Features**:
  - Automatic student account creation
  - Instructor preference validation
  - Duplicate request prevention
  - Course validation
- **Error Handling**: Validation errors, duplicate detection

#### GET /booking/available-instructors
- **Purpose**: Get available instructors for specific time slot
- **Access Level**: Public
- **Required Query Parameters**:
  - Course ID
  - Day
  - Start Time
  - End Time
- **Response**: Array of available instructor options
- **Features**: Real-time availability checking

#### POST /booking/validate-preferences
- **Purpose**: Validate instructor and time preferences
- **Access Level**: Public
- **Required Fields**:
  - Course ID
  - First Preference (optional)
  - Second Preference (optional)
- **Response**: Validation result with issues if any
- **Features**: Preference availability validation

### Availability Display Endpoints

#### GET /booking/availability/instructor/:instructor_id
- **Purpose**: Get instructor availability schedule
- **Access Level**: Public
- **Required Parameters**:
  - Instructor ID (UUID format)
- **Optional Query Parameters**:
  - Start Date
  - End Date
  - Include Details (boolean)
- **Response**: Instructor availability data

#### GET /booking/availability/room/:room_id
- **Purpose**: Get room availability schedule
- **Access Level**: Public
- **Required Parameters**:
  - Room ID (UUID format)
- **Optional Query Parameters**:
  - Start Date
  - End Date
- **Response**: Room availability data

#### GET /booking/availability/calendar
- **Purpose**: Get combined calendar availability
- **Access Level**: Public
- **Optional Query Parameters**:
  - Start Date
  - End Date
  - Instructor IDs (comma-separated)
  - Room IDs (comma-separated)
  - Course IDs (comma-separated)
  - View Type (instructor/room/combined)
- **Response**: Combined availability data

#### GET /booking/availability/find-slots
- **Purpose**: Find available time slots
- **Access Level**: Public
- **Required Query Parameters**:
  - Date
- **Optional Query Parameters**:
  - Instructor ID
  - Room ID
  - Minimum Duration (default 60 minutes)
  - Preferred Time Range
- **Requirements**: Either instructor ID or room ID required
- **Response**: Available slots data

### Protected Endpoints

#### GET /booking/bookings
- **Purpose**: List all bookings
- **Access Level**: Protected (admin only)
- **Authentication**: JWT token with admin role required
- **Response**: Array of all bookings with course data

#### POST /booking/bookings
- **Purpose**: Create new booking
- **Access Level**: Protected
- **Authentication**: JWT token required
- **Response**: Created booking data

#### GET /booking/bookings/:id
- **Purpose**: Get booking by ID
- **Access Level**: Protected
- **Authentication**: JWT token required
- **Authorization**: Users can only access their own bookings
- **Required Parameters**:
  - Booking ID (UUID format)
- **Response**: Booking details with course information

#### PUT /booking/bookings/:id
- **Purpose**: Update booking
- **Access Level**: Protected
- **Authentication**: JWT token required
- **Authorization**: Users can only update their own bookings
- **Required Parameters**:
  - Booking ID (UUID format)

#### DELETE /booking/bookings/:id
- **Purpose**: Delete booking
- **Access Level**: Protected
- **Authentication**: JWT token required
- **Authorization**: Users can only delete their own bookings
- **Restriction**: Only pending bookings can be deleted
- **Required Parameters**:
  - Booking ID (UUID format)

#### GET /booking/user/:userId
- **Purpose**: Get user bookings
- **Access Level**: Protected
- **Authentication**: JWT token required
- **Authorization**: Users can only view their own bookings
- **Required Parameters**:
  - User ID (UUID format)
- **Response**: User's bookings with course data

#### POST /booking/:id/confirm
- **Purpose**: Confirm booking
- **Access Level**: Protected (admin only)
- **Authentication**: JWT token with admin role required
- **Required Parameters**:
  - Booking ID (UUID format)
- **Restriction**: Only pending bookings can be confirmed

#### POST /booking/:id/cancel
- **Purpose**: Cancel booking
- **Access Level**: Protected
- **Authentication**: JWT token required
- **Authorization**: Users can cancel their own bookings, admins can cancel any
- **Required Parameters**:
  - Booking ID (UUID format)
- **Restriction**: Only pending or confirmed bookings can be cancelled

### Admin Management Endpoints

#### GET /booking/admin/bookings/pending
- **Purpose**: Get pending bookings with preferences
- **Access Level**: Protected (admin only)
- **Authentication**: JWT token with admin role required
- **Optional Query Parameters**:
  - Course ID
  - Status (default: pending)
- **Response**: Pending bookings with preference data

#### POST /booking/admin/bookings/:id/assign-slot
- **Purpose**: Assign time slot from preferences
- **Access Level**: Protected (admin only)
- **Authentication**: JWT token with admin role required
- **Required Parameters**:
  - Booking ID (UUID format)
- **Required Fields**:
  - Preference Choice (first/second)
  - Room ID (optional)
  - Notes (optional)
- **Features**: Real-time availability check, conflict detection
- **Process**: Creates class schedule and updates booking status

#### POST /booking/admin/bookings/:id/cancel
- **Purpose**: Cancel booking (admin)
- **Access Level**: Protected (admin only)
- **Authentication**: JWT token with admin role required
- **Required Parameters**:
  - Booking ID (UUID format)
- **Required Fields**:
  - Reason
  - Notes (optional)
- **Restriction**: Only pending bookings can be cancelled

### Conflict Management Endpoints

#### GET /booking/admin/conflicts/:schedule_id
- **Purpose**: Get conflict details
- **Access Level**: Protected (admin only)
- **Authentication**: JWT token with admin role required
- **Required Parameters**:
  - Schedule ID (UUID format)
- **Response**: Detailed conflict information

#### POST /booking/admin/conflicts/resolve
- **Purpose**: Resolve schedule conflicts
- **Access Level**: Protected (admin only)
- **Authentication**: JWT token with admin role required
- **Required Fields**:
  - Conflict ID
  - Resolution Action
  - Resolution Data
- **Supported Actions**: Room reassignment, time change, booking cancellation, postponement

### Health Check Endpoints

#### GET /booking/health
- **Purpose**: System health check
- **Access Level**: Public
- **Response**: System health status with appropriate HTTP status codes

#### GET /booking/health/circuit-breakers
- **Purpose**: Circuit breaker health status
- **Access Level**: Public
- **Response**: Circuit breaker status information

#### GET /booking/health/concurrency
- **Purpose**: Concurrency service health check
- **Access Level**: Public
- **Response**: Basic concurrency statistics

## Admin Service Endpoints

### Dashboard Endpoints

#### GET /admin/dashboard
- **Purpose**: Get admin dashboard statistics
- **Access Level**: Protected (admin only)
- **Authentication**: JWT token with admin role required
- **Response**: User stats, course stats, booking stats, recent activities
- **Features**: Aggregated data from multiple services

### User Management Endpoints

#### GET /admin/users
- **Purpose**: List all users
- **Access Level**: Protected (admin only)
- **Authentication**: JWT token with admin role required
- **Optional Query Parameters**:
  - Page (default: 1)
  - Limit (default: 20)
- **Response**: Paginated user list

#### GET /admin/users/:id
- **Purpose**: Get user details
- **Access Level**: Protected (admin only)
- **Authentication**: JWT token with admin role required
- **Required Parameters**:
  - User ID (UUID format)
- **Response**: User details with booking history

#### PUT /admin/users/:id
- **Purpose**: Update user
- **Access Level**: Protected (admin only)
- **Authentication**: JWT token with admin role required
- **Required Parameters**:
  - User ID (UUID format)
- **Response**: Updated user data

#### DELETE /admin/users/:id
- **Purpose**: Delete user
- **Access Level**: Protected (admin only)
- **Authentication**: JWT token with admin role required
- **Required Parameters**:
  - User ID (UUID format)
- **Response**: Deletion confirmation

### Course Management Endpoints

#### GET /admin/courses
- **Purpose**: List all courses for admin
- **Access Level**: Protected (admin only)
- **Authentication**: JWT token with admin role required
- **Response**: Courses with instructor and booking data

#### POST /admin/courses/:id/approve
- **Purpose**: Approve course
- **Access Level**: Protected (admin only)
- **Authentication**: JWT token with admin role required
- **Required Parameters**:
  - Course ID (UUID format)
- **Restriction**: Only pending courses can be approved
- **Response**: Approved course data

#### POST /admin/courses/:id/reject
- **Purpose**: Reject course
- **Access Level**: Protected (admin only)
- **Authentication**: JWT token with admin role required
- **Required Parameters**:
  - Course ID (UUID format)
- **Required Fields**:
  - Rejection Reason
- **Restriction**: Only pending courses can be rejected
- **Response**: Rejected course data

### Booking Management Endpoints

#### GET /admin/bookings
- **Purpose**: List all bookings for admin
- **Access Level**: Protected (admin only)
- **Authentication**: JWT token with admin role required
- **Optional Query Parameters**:
  - Status
  - Page (default: 1)
  - Limit (default: 20)
- **Response**: Paginated booking list with user and course data

## Recommendation Service Endpoints

### Assessment Endpoints

#### POST /assessment
- **Purpose**: Submit user assessment for AI processing
- **Access Level**: Protected (session-based)
- **Authentication**: Valid session required
- **Required Fields**:
  - Session ID
  - Assessment Data
- **Process**: 
  - Stores assessment data
  - Initiates AI processing
  - Updates status to processing
- **Response**: Assessment ID with processing status
- **Features**: Asynchronous AI processing

#### GET /results/:sessionId
- **Purpose**: Retrieve assessment results
- **Access Level**: Protected (session-based)
- **Authentication**: Valid session required
- **Required Parameters**:
  - Session ID
- **Response**: Assessment data and results (if available)
- **Features**: Handles both completed and processing assessments

### Health Check Endpoint

#### GET /health
- **Purpose**: Service health check
- **Access Level**: Public
- **Response**: Service status, version, and available features

## API Gateway Aggregation Endpoints

#### GET /dashboard/stats
- **Purpose**: Aggregated dashboard statistics
- **Access Level**: Protected (admin only)
- **Authentication**: JWT token with admin role required
- **Response**: Aggregated data from multiple services

#### GET /dashboard/admin
- **Purpose**: Comprehensive admin dashboard
- **Access Level**: Protected (admin only)
- **Authentication**: JWT token with admin role required
- **Response**: Complete admin dashboard data

#### GET /profile/:userId/full
- **Purpose**: Complete user profile
- **Access Level**: Protected
- **Authentication**: JWT token required
- **Required Parameters**:
  - User ID (UUID format)
- **Response**: Aggregated user profile data

## General Requirements

### Authentication
- JWT tokens required for protected endpoints
- Role-based access control for admin functions
- Session-based authentication for recommendation service

### Error Handling
- Consistent error response format
- Appropriate HTTP status codes
- Detailed error messages for validation failures
- Generic error messages for security-sensitive operations

### Validation
- Input validation for all required fields
- UUID format validation for ID parameters
- Email format validation
- Time format validation (HH:MM)

### Security
- Password strength validation
- Rate limiting considerations
- CORS configuration
- Request idempotency for critical operations

### Data Formats
- JSON request/response format
- ISO 8601 timestamp format
- UUID version 4 for ID parameters
- Standard HTTP methods

### Pagination
- Page and limit query parameters
- Total count in response
- Consistent pagination structure

## Future Considerations

### Rate Limiting
- Implement rate limiting for public endpoints
- Different limits for different user roles

### Caching
- Cache frequently accessed data
- Cache invalidation strategies

### Monitoring
- Request logging
- Performance monitoring
- Error tracking

### Versioning
- API versioning strategy
- Backward compatibility considerations