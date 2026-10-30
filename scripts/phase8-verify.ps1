
param()

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Prevent native stderr output from terminating the script on PowerShell 7.3+.
if ($null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)) {
    $PSNativeCommandUseErrorActionPreference = $false
}

# ============================================================
# CONFIGURATION
# ============================================================

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

$RunId = Get-Date -Format "yyyyMMdd-HHmmss"

$LogDirectory = Join-Path $RepoRoot "artifacts\phase8"
New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null

$LogFile = Join-Path $LogDirectory "verification-$RunId.log"

$Results = [System.Collections.Generic.List[object]]::new()

$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)

# ============================================================
# LOGGING
# ============================================================

function Write-Log {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Message
    )

    Write-Host $Message

    [System.IO.File]::AppendAllText(
        $LogFile,
        $Message + [Environment]::NewLine,
        $Utf8NoBom
    )
}

# ============================================================
# RESULT MANAGEMENT
# ============================================================

function Add-CheckResult {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [ValidateSet("PASS", "FAIL", "SKIPPED")]
        [string]$Status,

        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$ExitCode
    )

    $Results.Add(
        [PSCustomObject]@{
            Check    = $Name
            Status   = $Status
            ExitCode = $ExitCode
        }
    )
}

# ============================================================
# GENERIC COMMAND EXECUTION
# ============================================================

function Invoke-Check {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$Executable,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [Parameter(Mandatory = $true)]
        [string]$CommandDisplay
    )

    Write-Log ""
    Write-Log "============================================================"
    Write-Log "CHECK: $Name"
    Write-Log "COMMAND: $CommandDisplay"
    Write-Log "============================================================"

    $ExitCode = 1
    $CommandOutput = @()

    $PreviousErrorActionPreference = $ErrorActionPreference

    try {
        # Capture stdout and stderr without terminating the script.
        $ErrorActionPreference = "Continue"

        $CommandOutput = @(
            & $Executable @Arguments 2>&1
        )

        $ExitCode = $LASTEXITCODE

        if ($null -eq $ExitCode) {
            $ExitCode = 1
        }
    }
    catch {
        $CommandOutput = @(
            "ERROR: $($_.Exception.Message)"
        )

        $ExitCode = 1
    }
    finally {
        $ErrorActionPreference = $PreviousErrorActionPreference
    }

    # Write command output to the console and UTF-8 log.
    foreach ($Item in $CommandOutput) {
        if ($Item -is [System.Management.Automation.ErrorRecord]) {
            $Line = $Item.ToString()
        }
        else {
            $Line = [string]$Item
        }

        Write-Log $Line
    }

    $Status = if ($ExitCode -eq 0) {
        "PASS"
    }
    else {
        "FAIL"
    }

    Add-CheckResult `
        -Name $Name `
        -Status $Status `
        -ExitCode ([string]$ExitCode)

    Write-Log ""
    Write-Log "STATUS: $Status (Exit code: $ExitCode)"

    return [int]$ExitCode
}

# ============================================================
# FINAL SUMMARY
# ============================================================

function Complete-Verification {

    Write-Log ""
    Write-Log "============================================================"
    Write-Log "PHASE 8 VERIFICATION SUMMARY"
    Write-Log "============================================================"

    $Summary = $Results |
        Format-Table -AutoSize |
        Out-String

    Write-Host $Summary

    [System.IO.File]::AppendAllText(
        $LogFile,
        $Summary,
        $Utf8NoBom
    )

    $Passed = @(
        $Results | Where-Object { $_.Status -eq "PASS" }
    )

    $Failures = @(
        $Results | Where-Object { $_.Status -eq "FAIL" }
    )

    $Skipped = @(
        $Results | Where-Object { $_.Status -eq "SKIPPED" }
    )

    Write-Log "Total checks: $($Results.Count)"
    Write-Log "Passed:       $($Passed.Count)"
    Write-Log "Failed:       $($Failures.Count)"
    Write-Log "Skipped:      $($Skipped.Count)"

    Write-Log "Verification log: $LogFile"

    if ($Failures.Count -gt 0) {
        Write-Log ""
        Write-Log "RESULT: FAILED - Fix the failing checks and run again."
        return 1
    }

    if ($Skipped.Count -gt 0) {
        Write-Log ""
        Write-Log "RESULT: PARTIAL - Some verification checks were skipped."
        return 2
    }

    Write-Log ""
    Write-Log "RESULT: ALL CHECKS PASSED"

    return 0
}

# ============================================================
# START VERIFICATION
# ============================================================

Write-Log "TechTicket Phase 8 Verification"
Write-Log "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Log "Repository: $RepoRoot"

try {
    $CommitOutput = & git rev-parse --short HEAD 2>$null

    if ($LASTEXITCODE -eq 0 -and $CommitOutput) {
        $Commit = [string]$CommitOutput
    }
    else {
        $Commit = "unavailable"
    }
}
catch {
    $Commit = "unavailable"
}

Write-Log "Git commit: $Commit"

# ============================================================
# DOCKER PREFLIGHT
# ============================================================

$DockerCommand = Get-Command docker -ErrorAction SilentlyContinue

if ($null -eq $DockerCommand) {
    Write-Log ""
    Write-Log "ERROR: Docker CLI was not found."

    Add-CheckResult `
        -Name "Docker Web Service Preflight" `
        -Status "FAIL" `
        -ExitCode "1"

    exit (Complete-Verification)
}

$PreflightExitCode = Invoke-Check `
    -Name "Docker Web Service Preflight" `
    -Executable "docker" `
    -Arguments @(
        "compose",
        "exec",
        "-T",
        "web",
        "npm",
        "--version"
    ) `
    -CommandDisplay "docker compose exec -T web npm --version"

if ($PreflightExitCode -ne 0) {
    Write-Log ""
    Write-Log "The Docker web service is unavailable."
    Write-Log "Start the application stack using: docker compose up -d"

    exit (Complete-Verification)
}

# ============================================================
# FRONTEND UNIT TESTS
# ============================================================

Invoke-Check `
    -Name "Frontend Unit Tests" `
    -Executable "docker" `
    -Arguments @(
        "compose",
        "exec",
        "-T",
        "web",
        "npm",
        "run",
        "test"
    ) `
    -CommandDisplay "docker compose exec -T web npm run test"

# ============================================================
# TYPESCRIPT
# ============================================================

Invoke-Check `
    -Name "Frontend TypeScript Check" `
    -Executable "docker" `
    -Arguments @(
        "compose",
        "exec",
        "-T",
        "web",
        "npm",
        "run",
        "typecheck"
    ) `
    -CommandDisplay "docker compose exec -T web npm run typecheck"

# ============================================================
# ESLINT
# ============================================================

Invoke-Check `
    -Name "Frontend Lint" `
    -Executable "docker" `
    -Arguments @(
        "compose",
        "exec",
        "-T",
        "web",
        "npm",
        "run",
        "lint"
    ) `
    -CommandDisplay "docker compose exec -T web npm run lint"

# ============================================================
# PLAYWRIGHT BROWSER REGRESSION
# Runs inside the dedicated Playwright Docker container.
# No host-side Node.js, npm or browser installation required.
# ============================================================

if (
    [string]::IsNullOrWhiteSpace($env:TECHTICKET_E2E_EMAIL) -or
    [string]::IsNullOrWhiteSpace($env:TECHTICKET_E2E_PASSWORD)
) {
    Write-Log ""
    Write-Log "============================================================"
    Write-Log "CHECK: Playwright Browser Regression"
    Write-Log "============================================================"

    Write-Log "SKIPPED: Test account credentials are not configured."
    Write-Log "Set TECHTICKET_E2E_EMAIL and TECHTICKET_E2E_PASSWORD in PowerShell."

    Add-CheckResult `
        -Name "Playwright Browser Regression" `
        -Status "SKIPPED" `
        -ExitCode "-"
}
else {
    Invoke-Check `
        -Name "Playwright Browser Regression" `
        -Executable "docker" `
        -Arguments @(
            "compose",
            "--profile",
            "e2e",
            "run",
            "--rm",
            "-T",
            "--no-deps",
            "e2e",
            "npm",
            "run",
            "test:e2e",
            "--workspace",
            "web"
        ) `
        -CommandDisplay "docker compose --profile e2e run --rm -T --no-deps e2e npm run test:e2e --workspace web"
}

# ============================================================
# PRODUCTION BUILD
# Kept after browser tests to avoid interfering with the
# running Next.js development server during visual regression.
# ============================================================

Invoke-Check `
    -Name "Frontend Production Build" `
    -Executable "docker" `
    -Arguments @(
        "compose",
        "exec",
        "-T",
        "web",
        "npm",
        "run",
        "build"
    ) `
    -CommandDisplay "docker compose exec -T web npm run build"

# ============================================================
# COMPLETE VERIFICATION
# ============================================================

$FinalExitCode = Complete-Verification

exit $FinalExitCode
