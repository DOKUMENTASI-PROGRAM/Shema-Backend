# Script untuk koneksi ke Supabase Remote Database
# Usage: .\scripts\connect-remote-supabase.ps1 [command]
#
# Commands:
#   psql       - Buka interactive psql shell
#   query      - Jalankan query dari file
#   exec       - Jalankan query langsung
#   backup     - Backup database
#   restore    - Restore database

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('psql', 'query', 'exec', 'backup', 'restore', 'help')]
    [string]$Command = 'psql',

    [Parameter(Mandatory=$false)]
    [string]$File = '',

    [Parameter(Mandatory=$false)]
    [string]$Query = '',

    [Parameter(Mandatory=$false)]
    [string]$Table = ''
)

# Set ErrorActionPreference
$ErrorActionPreference = "Stop"

# Load environment variables from .env.production
$envFile = Join-Path $PSScriptRoot "..\..\.env.production"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, 'Process')
        }
    }
    Write-Host "✓ Loaded environment from .env.production" -ForegroundColor Green
}

# Connection string dari environment - menggunakan IPv6 address langsung untuk bypass DNS IPv4 issues
$DB_HOST = "[2406:da18:243:7420:b3e5:84a4:6923:cb67]"
$DB_PORT = "5432"
$DB_NAME = "postgres"
$DB_USER = "postgres"
$DB_PASS = "shemamusic123#"
$CONNECTION_STRING = "postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

Write-Host "`n=== Supabase Remote Database Access ===" -ForegroundColor Cyan
Write-Host "Host: $DB_HOST" -ForegroundColor Yellow
Write-Host "Database: $DB_NAME" -ForegroundColor Yellow
Write-Host ""

switch ($Command) {
    'psql' {
        Write-Host "Opening interactive psql shell..." -ForegroundColor Green
        Write-Host "Type \q to exit, \? for help" -ForegroundColor Gray
        Write-Host ""
        
        docker run -it --rm `
            --network shema-music-network `
            postgres:15-alpine `
            psql $CONNECTION_STRING
    }
    
    'query' {
        if ([string]::IsNullOrEmpty($File)) {
            Write-Host "Error: Please specify a file with -File parameter" -ForegroundColor Red
            Write-Host "Example: .\connect-remote-supabase.ps1 query -File query.sql" -ForegroundColor Yellow
            exit 1
        }
        
        if (-not (Test-Path $File)) {
            Write-Host "Error: File not found: $File" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "Executing queries from file: $File" -ForegroundColor Green
        
        docker run -it --rm `
            -v "${PWD}:/workspace" `
            --network shema-music-network `
            postgres:15-alpine `
            psql $CONNECTION_STRING -f "/workspace/$File"
    }
    
    'exec' {
        if ([string]::IsNullOrEmpty($Query)) {
            Write-Host "Error: Please specify a query with -Query parameter" -ForegroundColor Red
            Write-Host "Example: .\connect-remote-supabase.ps1 exec -Query 'SELECT * FROM auth.users LIMIT 5;'" -ForegroundColor Yellow
            exit 1
        }
        
        Write-Host "Executing query: $Query" -ForegroundColor Green
        Write-Host ""
        
        docker run -it --rm `
            --network shema-music-network `
            postgres:15-alpine `
            psql $CONNECTION_STRING -c $Query
    }
    
    'backup' {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupDir = Join-Path $PSScriptRoot "..\backups"
        
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir | Out-Null
        }
        
        if ([string]::IsNullOrEmpty($Table)) {
            # Full backup
            $backupFile = "backup_full_${timestamp}.sql"
            Write-Host "Creating full database backup..." -ForegroundColor Green
            
            docker run -it --rm `
                -v "${backupDir}:/backup" `
                --network shema-music-network `
                postgres:15-alpine `
                pg_dump $CONNECTION_STRING -f "/backup/$backupFile"
        } else {
            # Table backup
            $backupFile = "backup_${Table}_${timestamp}.sql"
            Write-Host "Creating backup for table: $Table" -ForegroundColor Green
            
            docker run -it --rm `
                -v "${backupDir}:/backup" `
                --network shema-music-network `
                postgres:15-alpine `
                pg_dump $CONNECTION_STRING -t $Table -f "/backup/$backupFile"
        }
        
        Write-Host "Backup saved to: $backupDir\$backupFile" -ForegroundColor Green
    }
    
    'restore' {
        if ([string]::IsNullOrEmpty($File)) {
            Write-Host "Error: Please specify a backup file with -File parameter" -ForegroundColor Red
            Write-Host "Example: .\connect-remote-supabase.ps1 restore -File backups\backup.sql" -ForegroundColor Yellow
            exit 1
        }
        
        if (-not (Test-Path $File)) {
            Write-Host "Error: File not found: $File" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "WARNING: This will restore data from: $File" -ForegroundColor Yellow
        $confirm = Read-Host "Are you sure you want to continue? (yes/no)"
        
        if ($confirm -ne 'yes') {
            Write-Host "Restore cancelled." -ForegroundColor Yellow
            exit 0
        }
        
        Write-Host "Restoring database from file: $File" -ForegroundColor Green
        
        docker run -it --rm `
            -v "${PWD}:/workspace" `
            --network shema-music-network `
            postgres:15-alpine `
            psql $CONNECTION_STRING -f "/workspace/$File"
    }
    
    'help' {
        Write-Host @"
Supabase Remote Database Access Script

Usage: .\connect-remote-supabase.ps1 [command] [options]

Commands:
  psql          Open interactive psql shell
  query         Execute SQL from file
  exec          Execute SQL query directly
  backup        Create database backup
  restore       Restore database from backup
  help          Show this help message

Options:
  -File <path>      Path to SQL file (for query/restore commands)
  -Query <sql>      SQL query to execute (for exec command)
  -Table <name>     Table name (for backup command)

Examples:
  # Open interactive shell
  .\connect-remote-supabase.ps1 psql

  # Execute query from file
  .\connect-remote-supabase.ps1 query -File queries\my-query.sql

  # Execute query directly
  .\connect-remote-supabase.ps1 exec -Query "SELECT * FROM auth.users LIMIT 5;"

  # Backup full database
  .\connect-remote-supabase.ps1 backup

  # Backup specific table
  .\connect-remote-supabase.ps1 backup -Table public.courses

  # Restore database
  .\connect-remote-supabase.ps1 restore -File backups\backup.sql

Common psql commands (in interactive mode):
  \l              List all databases
  \dn             List all schemas
  \dt             List tables in current schema
  \dt *.*         List all tables in all schemas
  \d table_name   Describe table structure
  \q              Quit psql

"@ -ForegroundColor White
    }
}

Write-Host ""