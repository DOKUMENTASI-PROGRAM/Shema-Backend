# Sequence Diagram - Notification Service

## 1. Gambaran Umum

Notification Service adalah layanan untuk mengelola notifikasi real-time menggunakan WebSocket dan Kafka. Service ini berjalan pada Port 3009 dan bertanggung jawab untuk:

- **WebSocket Management**: Mengelola koneksi WebSocket dari client
- **Kafka Consumption**: Mengkonsumsi event dari berbagai service
- **Event Broadcasting**: Menyiarkan event ke client yang tersubscribe
- **Connection Tracking**: Melacak koneksi aktif dan subscription

## 2. Arsitektur Service

### 2.1 Komponen Utama

| Komponen | Fungsi |
|----------|--------|
| WebSocket Server | Mengelola koneksi client |
| Kafka Consumer | Menerima event dari message broker |
| Connection Manager | Melacak client dan subscription |
| Message Router | Routing pesan ke client yang tepat |

### 2.2 Event-Driven Architecture

Notification Service bertindak sebagai bridge antara internal microservices dan external clients melalui event streaming.

```
┌────────────────────┐    Kafka Topics     ┌───────────────────┐
│   Booking Service  │──────────────────→ │                   │
│   Course Service   │──────────────────→ │ Notification Svc  │
│   Admin Service    │──────────────────→ │                   │
│   Recommendation   │──────────────────→ │                   │
└────────────────────┘                     └────────┬──────────┘
                                                    │ WebSocket
                                                    ↓
                                           ┌───────────────────┐
                                           │   Client Browser  │
                                           └───────────────────┘
```

## 3. Sequence Diagram - WebSocket Connection

### 3.1 Initial Connection Flow

Diagram ini menunjukkan alur koneksi WebSocket awal dari client.

#### PlantUML

```plantuml
@startuml WebSocket_Connection
title WebSocket Connection Flow

actor Client
participant "API Gateway\n(/ws/availability)" as Gateway
participant "Notification Service\n(Port 3009)" as NotifSvc
participant "Connection Manager" as ConnMgr

== Connection Establishment ==
Client -> Gateway: WebSocket Upgrade\nGET /ws/availability\nHeaders: Upgrade: websocket

Gateway -> Gateway: Validate Origin\n(CORS Check)

alt Invalid Origin
    Gateway --> Client: 403 Forbidden
else Valid Origin
    Gateway -> Gateway: Upgrade to WebSocket
    Gateway --> Client: 101 Switching Protocols
    
    Gateway -> ConnMgr: Register Connection\n{clientId, timestamp}
    activate ConnMgr
    ConnMgr -> ConnMgr: Store in Map\n(clientId → WebSocket)
    ConnMgr --> Gateway: Registered
    deactivate ConnMgr
    
    Gateway --> Client: Connection Established\n{type: "connected", clientId: "xxx"}
end

== Connection Heartbeat ==
loop Every 30 seconds
    Gateway -> Client: Ping
    Client --> Gateway: Pong
    
    alt No Pong Response
        Gateway -> ConnMgr: Remove Dead Connection
        Gateway --> Client: Connection Closed
    end
end

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title WebSocket Connection Flow
    
    actor Client
    participant Gateway as API Gateway<br/>(/ws/availability)
    participant NotifSvc as Notification Service
    participant ConnMgr as Connection Manager
    
    Note over Client,ConnMgr: Connection Establishment
    
    Client->>Gateway: WebSocket Upgrade Request
    Gateway->>Gateway: Validate Origin
    
    alt Invalid Origin
        Gateway-->>Client: 403 Forbidden
    else Valid Origin
        Gateway-->>Client: 101 Switching Protocols
        Gateway->>ConnMgr: Register Connection
        ConnMgr-->>Gateway: Registered
        Gateway-->>Client: {type: "connected"}
    end
    
    Note over Client,ConnMgr: Connection Heartbeat
    
    loop Every 30 seconds
        Gateway->>Client: Ping
        Client-->>Gateway: Pong
    end
```

### 3.2 Subscription Flow

Diagram ini menunjukkan alur subscription client ke topik tertentu.

#### PlantUML

```plantuml
@startuml Subscription_Flow
title WebSocket Subscription Flow

actor Client
participant "WebSocket Server" as WS
participant "Connection Manager" as ConnMgr

Client -> WS: Send Message\n{\n  type: "subscribe",\n  filters: {\n    course_id: "xxx",\n    session_id: "yyy"\n  }\n}

WS -> WS: Parse Message\n(JSON validate)

alt Invalid Message Format
    WS --> Client: Error\n{type: "error", message: "Invalid format"}
else Valid Format
    WS -> ConnMgr: Add Subscription\n(clientId, filters)
    activate ConnMgr
    
    ConnMgr -> ConnMgr: Store Filters\n(Map: clientId → filters)
    ConnMgr --> WS: Subscription Added
    deactivate ConnMgr
    
    WS --> Client: Success\n{\n  type: "subscribed",\n  filters: {...}\n}
end

== Unsubscribe ==
Client -> WS: Send Message\n{type: "unsubscribe", topic: "xxx"}

WS -> ConnMgr: Remove Subscription
ConnMgr --> WS: Removed

WS --> Client: {type: "unsubscribed"}

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title WebSocket Subscription Flow
    
    actor Client
    participant WS as WebSocket Server
    participant ConnMgr as Connection Manager
    
    Client->>WS: {type: "subscribe", filters: {...}}
    WS->>WS: Parse Message
    
    alt Invalid Format
        WS-->>Client: {type: "error"}
    else Valid Format
        WS->>ConnMgr: Add Subscription
        ConnMgr-->>WS: Subscription Added
        WS-->>Client: {type: "subscribed"}
    end
    
    Note over Client,ConnMgr: Unsubscribe
    
    Client->>WS: {type: "unsubscribe"}
    WS->>ConnMgr: Remove Subscription
    WS-->>Client: {type: "unsubscribed"}
```

## 4. Sequence Diagram - Kafka Event Consumption

### 4.1 Booking Event Flow

Diagram ini menunjukkan alur konsumsi event booking dan broadcasting ke client.

#### PlantUML

```plantuml
@startuml Booking_Event_Flow
title Booking Event Consumption Flow

participant "Booking Service" as BookingSvc
participant "Kafka" as Kafka
participant "Notification Service" as NotifSvc
participant "Connection Manager" as ConnMgr
participant "WebSocket Server" as WS
actor "Subscribed Client" as Client

== Event Publication ==
BookingSvc -> Kafka: Produce Event\n{\n  topic: "booking.created",\n  data: {\n    booking_id: "xxx",\n    course_id: "yyy",\n    student_id: "zzz"\n  }\n}
activate Kafka
Kafka --> BookingSvc: Acknowledged
deactivate Kafka

== Event Consumption ==
Kafka -> NotifSvc: Consume Event\n(topic: booking.created)
activate NotifSvc

NotifSvc -> NotifSvc: Parse Event Data
NotifSvc -> NotifSvc: Transform to Notification\n{type, payload, timestamp}

NotifSvc -> ConnMgr: Get Matching Subscriptions\n(filter: course_id = "yyy")
activate ConnMgr
ConnMgr --> NotifSvc: List of ClientIds
deactivate ConnMgr

== Broadcasting ==
loop For Each Subscribed Client
    NotifSvc -> WS: Send Notification\n(clientId, payload)
    WS --> Client: Push Message\n{\n  type: "booking.created",\n  booking: {...},\n  timestamp: "..."\n}
end

deactivate NotifSvc

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Booking Event Consumption Flow
    
    participant BookingSvc as Booking Service
    participant Kafka as Kafka
    participant NotifSvc as Notification Service
    participant ConnMgr as Connection Manager
    participant WS as WebSocket Server
    actor Client as Subscribed Client
    
    Note over BookingSvc,Client: Event Publication
    
    BookingSvc->>Kafka: Produce "booking.created"
    Kafka-->>BookingSvc: Acknowledged
    
    Note over BookingSvc,Client: Event Consumption
    
    Kafka->>NotifSvc: Consume Event
    activate NotifSvc
    
    NotifSvc->>NotifSvc: Parse & Transform
    NotifSvc->>ConnMgr: Get Matching Subscriptions
    ConnMgr-->>NotifSvc: List of ClientIds
    
    Note over BookingSvc,Client: Broadcasting
    
    loop For Each Subscribed Client
        NotifSvc->>WS: Send Notification
        WS-->>Client: Push Message
    end
    
    deactivate NotifSvc
```

### 4.2 Schedule Update Event Flow

Diagram ini menunjukkan alur notifikasi update jadwal.

#### PlantUML

```plantuml
@startuml Schedule_Update_Flow
title Schedule Update Event Flow

participant "Admin Service" as AdminSvc
participant "Kafka" as Kafka
participant "Notification Service" as NotifSvc
participant "Connection Manager" as ConnMgr
actor "Admin Client" as Admin
actor "Public Client" as Public

AdminSvc -> Kafka: Produce Event\n{\n  topic: "schedule.updated",\n  data: {\n    schedule_id: "xxx",\n    room_id: "yyy",\n    action: "updated"\n  }\n}

Kafka -> NotifSvc: Consume Event
activate NotifSvc

NotifSvc -> NotifSvc: Build Notification Payload

NotifSvc -> ConnMgr: Get Admin Subscriptions\n(role: admin)
ConnMgr --> NotifSvc: Admin ClientIds

NotifSvc -> ConnMgr: Get Public Subscriptions\n(filter: room_id)
ConnMgr --> NotifSvc: Public ClientIds

par Parallel Broadcasting
    NotifSvc ->> Admin: Push to Admin\n{type: "schedule.updated",\nfull_details: {...}}
and
    NotifSvc ->> Public: Push to Public\n{type: "availability.changed",\nsummary: {...}}
end

deactivate NotifSvc

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Schedule Update Event Flow
    
    participant AdminSvc as Admin Service
    participant Kafka as Kafka
    participant NotifSvc as Notification Service
    participant ConnMgr as Connection Manager
    actor Admin as Admin Client
    actor Public as Public Client
    
    AdminSvc->>Kafka: Produce "schedule.updated"
    
    Kafka->>NotifSvc: Consume Event
    activate NotifSvc
    
    NotifSvc->>NotifSvc: Build Notification Payload
    
    NotifSvc->>ConnMgr: Get Admin Subscriptions
    ConnMgr-->>NotifSvc: Admin ClientIds
    
    NotifSvc->>ConnMgr: Get Public Subscriptions
    ConnMgr-->>NotifSvc: Public ClientIds
    
    par Parallel Broadcasting
        NotifSvc-->>Admin: Push (full_details)
    and
        NotifSvc-->>Public: Push (summary)
    end
    
    deactivate NotifSvc
```

## 5. Sequence Diagram - Admin Notifications

### 5.1 Admin WebSocket Connection

Diagram ini menunjukkan alur koneksi WebSocket khusus untuk admin.

#### PlantUML

```plantuml
@startuml Admin_WebSocket
title Admin WebSocket Connection Flow

actor Admin
participant "API Gateway\n(/ws)" as Gateway
participant "Auth Middleware" as Auth
participant "WebSocket Server" as WS
participant "Connection Manager" as ConnMgr
database "Redis" as Redis

Admin -> Gateway: WebSocket Upgrade\nGET /ws\nCookie: session_id=xxx

Gateway -> Auth: Validate Session
activate Auth
Auth -> Redis: GET session:xxx
Redis --> Auth: Session Data\n{user_id, role: "admin"}

alt Invalid Session
    Auth --> Gateway: Unauthorized
    Gateway --> Admin: 401 Unauthorized
else Valid Admin Session
    Auth --> Gateway: Authorized\n{user_id, role}
end
deactivate Auth

Gateway -> Gateway: Upgrade to WebSocket
Gateway --> Admin: 101 Switching Protocols

Gateway -> ConnMgr: Register Admin Connection\n{clientId, userId, role: "admin"}
ConnMgr -> ConnMgr: Store in Admin Map
ConnMgr --> Gateway: Registered

Gateway --> Admin: Connected\n{type: "connected", role: "admin"}

== Admin-Specific Subscriptions ==
Admin -> WS: Subscribe All Notifications\n{type: "subscribe", scope: "all"}

WS -> ConnMgr: Add Full Subscription
ConnMgr --> WS: Subscribed

WS --> Admin: {type: "subscribed", scope: "all"}

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Admin WebSocket Connection Flow
    
    actor Admin
    participant Gateway as API Gateway (/ws)
    participant Auth as Auth Middleware
    participant WS as WebSocket Server
    participant ConnMgr as Connection Manager
    participant Redis as Redis
    
    Admin->>Gateway: WebSocket Upgrade<br/>Cookie: session_id
    
    Gateway->>Auth: Validate Session
    Auth->>Redis: GET session
    Redis-->>Auth: Session Data
    
    alt Invalid Session
        Auth-->>Gateway: Unauthorized
        Gateway-->>Admin: 401 Unauthorized
    else Valid Admin Session
        Auth-->>Gateway: Authorized
    end
    
    Gateway-->>Admin: 101 Switching Protocols
    Gateway->>ConnMgr: Register Admin Connection
    Gateway-->>Admin: {type: "connected", role: "admin"}
    
    Note over Admin,ConnMgr: Admin-Specific Subscriptions
    
    Admin->>WS: {type: "subscribe", scope: "all"}
    WS->>ConnMgr: Add Full Subscription
    WS-->>Admin: {type: "subscribed"}
```

## 6. Sequence Diagram - Availability Updates

### 6.1 Real-time Availability Broadcast

Diagram ini menunjukkan alur broadcast ketersediaan slot jadwal.

#### PlantUML

```plantuml
@startuml Availability_Broadcast
title Real-time Availability Broadcast Flow

participant "Booking Service" as BookingSvc
participant "Kafka" as Kafka
participant "Notification Service" as NotifSvc
participant "WebSocket Server" as WS
actor "Client A\n(viewing course)" as ClientA
actor "Client B\n(viewing course)" as ClientB
actor "Client C\n(different course)" as ClientC

== Slot Booked Event ==
BookingSvc -> Kafka: Produce\n{\n  topic: "booking.created",\n  course_id: "PIANO-101",\n  schedule_id: "sch-123",\n  slots_remaining: 4\n}

Kafka -> NotifSvc: Consume Event
activate NotifSvc

NotifSvc -> NotifSvc: Build Availability Update\n{course_id, schedule_id, slots}

NotifSvc -> WS: Get Subscribed Clients\n(filter: course_id = "PIANO-101")
WS --> NotifSvc: [ClientA, ClientB]

note right of NotifSvc: Client C not included\n(subscribed to different course)

par Broadcast to Matching Clients
    NotifSvc -> ClientA: Push Update\n{type: "availability.updated",\nslots_remaining: 4}
and
    NotifSvc -> ClientB: Push Update\n{type: "availability.updated",\nslots_remaining: 4}
end

deactivate NotifSvc

ClientA -> ClientA: Update UI\n(decrement slot count)
ClientB -> ClientB: Update UI\n(decrement slot count)

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Real-time Availability Broadcast Flow
    
    participant BookingSvc as Booking Service
    participant Kafka as Kafka
    participant NotifSvc as Notification Service
    participant WS as WebSocket Server
    actor ClientA as Client A<br/>(viewing course)
    actor ClientB as Client B<br/>(viewing course)
    actor ClientC as Client C<br/>(different course)
    
    BookingSvc->>Kafka: Produce "booking.created"<br/>{course_id: "PIANO-101"}
    
    Kafka->>NotifSvc: Consume Event
    activate NotifSvc
    
    NotifSvc->>NotifSvc: Build Availability Update
    
    NotifSvc->>WS: Get Subscribed Clients
    WS-->>NotifSvc: [ClientA, ClientB]
    
    Note right of ClientC: Not included<br/>(different course)
    
    par Broadcast to Matching Clients
        NotifSvc-->>ClientA: Push Update
    and
        NotifSvc-->>ClientB: Push Update
    end
    
    deactivate NotifSvc
    
    ClientA->>ClientA: Update UI
    ClientB->>ClientB: Update UI
```

## 7. Sequence Diagram - Connection Management

### 7.1 Connection Cleanup Flow

Diagram ini menunjukkan alur pembersihan koneksi yang terputus.

#### PlantUML

```plantuml
@startuml Connection_Cleanup
title Connection Cleanup Flow

participant "WebSocket Server" as WS
participant "Connection Manager" as ConnMgr
participant "Redis" as Redis
actor "Client" as Client

== Normal Disconnect ==
Client -> WS: Close Connection\n(code: 1000, reason: "User closed")

WS -> WS: Handle Close Event
WS -> ConnMgr: Remove Connection\n(clientId: "xxx")
activate ConnMgr
ConnMgr -> ConnMgr: Delete from Map
ConnMgr -> ConnMgr: Remove Subscriptions
ConnMgr --> WS: Cleaned
deactivate ConnMgr

== Abnormal Disconnect ==
WS -> WS: Connection Error\n(network failure)

WS -> WS: Trigger Close Handler

WS -> ConnMgr: Remove Connection\n(clientId: "xxx")
ConnMgr --> WS: Cleaned

== Periodic Cleanup ==
loop Every 60 seconds
    WS -> WS: Check All Connections
    
    loop For Each Connection
        WS -> Client: Ping
        
        alt No Response within 10s
            WS -> WS: Mark as Dead
            WS -> ConnMgr: Remove Connection
        end
    end
end

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Connection Cleanup Flow
    
    participant WS as WebSocket Server
    participant ConnMgr as Connection Manager
    participant Redis as Redis
    actor Client
    
    Note over WS,Client: Normal Disconnect
    
    Client->>WS: Close Connection
    WS->>WS: Handle Close Event
    WS->>ConnMgr: Remove Connection
    ConnMgr-->>WS: Cleaned
    
    Note over WS,Client: Abnormal Disconnect
    
    WS->>WS: Connection Error
    WS->>WS: Trigger Close Handler
    WS->>ConnMgr: Remove Connection
    
    Note over WS,Client: Periodic Cleanup
    
    loop Every 60 seconds
        WS->>WS: Check All Connections
        loop For Each Connection
            WS->>Client: Ping
            alt No Response
                WS->>ConnMgr: Remove Dead Connection
            end
        end
    end
```

## 8. Kafka Topics

### 8.1 Consumed Topics

| Topic | Publisher | Event Types |
|-------|-----------|-------------|
| booking.created | Booking Service | New booking created |
| booking.cancelled | Booking Service | Booking cancelled |
| booking.confirmed | Booking Service | Booking confirmed |
| schedule.updated | Admin Service | Schedule modified |
| schedule.deleted | Admin Service | Schedule removed |
| admin.notifications | Various | General admin alerts |
| assessment.submitted | Recommendation | New assessment |

### 8.2 Event Payload Structure

```
{
  topic: string,
  timestamp: ISO8601,
  event_type: string,
  payload: {
    id: string,
    action: string,
    data: {...}
  }
}
```

## 9. WebSocket Message Types

### 9.1 Client to Server Messages

| Type | Description | Payload |
|------|-------------|---------|
| subscribe | Subscribe to updates | {filters: {...}} |
| unsubscribe | Unsubscribe from topic | {topic: string} |
| ping | Keep-alive ping | {} |

### 9.2 Server to Client Messages

| Type | Description | Payload |
|------|-------------|---------|
| connected | Connection established | {clientId} |
| subscribed | Subscription confirmed | {filters} |
| availability.updated | Slot availability changed | {course_id, slots} |
| booking.created | New booking notification | {booking} |
| schedule.updated | Schedule change | {schedule} |
| error | Error message | {message, code} |

## 10. Connection Manager Data Structures

### 10.1 Connection Store

```
connections: Map<clientId, {
  ws: WebSocket,
  userId: string | null,
  role: "admin" | "public",
  connectedAt: timestamp,
  lastPing: timestamp
}>
```

### 10.2 Subscription Store

```
subscriptions: Map<clientId, {
  course_id?: string[],
  room_id?: string[],
  session_id?: string,
  scope: "all" | "filtered"
}>
```

## 11. Error Handling

### 11.1 WebSocket Errors

| Error | Action |
|-------|--------|
| Connection failed | Retry with exponential backoff |
| Message parse error | Send error message, maintain connection |
| Authentication failed | Close connection with 4001 code |

### 11.2 Kafka Errors

| Error | Action |
|-------|--------|
| Consumer disconnect | Auto-reconnect with retry |
| Deserialization error | Log and skip message |
| Consumer group rebalance | Handle gracefully |

## 12. Integration Summary

### 12.1 Service Integration

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Booking Service │────→│     Kafka       │────→│  Notification   │
└─────────────────┘     └────────┬────────┘     │    Service      │
                                 │              └────────┬────────┘
┌─────────────────┐              │                       │
│  Admin Service  │──────────────┘                       │
└─────────────────┘                                      │
                                                         ↓
┌─────────────────┐                              ┌─────────────────┐
│ Recommendation  │─────────────────────────────→│   WebSocket     │
│    Service      │                              │    Clients      │
└─────────────────┘                              └─────────────────┘
```

### 12.2 Port Configuration

| Service | Port | WebSocket Endpoint |
|---------|------|-------------------|
| API Gateway | 3000 | /ws, /ws/availability |
| Notification | 3009 | Internal WebSocket |

### 12.3 Environment Variables

| Variable | Description |
|----------|-------------|
| KAFKA_BROKERS | Kafka broker addresses |
| KAFKA_GROUP_ID | Consumer group ID |
| WS_PORT | WebSocket server port |
| REDIS_URL | Redis connection URL |
