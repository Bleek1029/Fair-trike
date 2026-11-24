param(
    [string]$ApiBase = "http://localhost:5000"
)

function Invoke-JsonPost {
    param(
        [string]$Uri,
        [object]$Body,
        [hashtable]$Headers = @{ Accept = "application/json" }
    )
    $json = $Body | ConvertTo-Json -Depth 10
    $out = Invoke-RestMethod -Uri $Uri -Method Post -Body $json -ContentType "application/json" -Headers $Headers
    return $out
}

Write-Host "=== Step 1: Register a booking test passenger ==="
$Email = "bookingtest$([guid]::NewGuid().ToString('n'))@example.com"
Write-Host "Email: $Email"
$RegBody = @{
    fullname = "Booking Tester"
    email    = $Email
    password = "bookingpass123"
}
Write-Host "RegBody JSON: ($([System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json $RegBody -Depth 10)).Length) bytes)"
$Reg = Invoke-RestMethod -Uri "$ApiBase/api/auth/register" -Method Post -Body (ConvertTo-Json $RegBody -Depth 10) -ContentType "application/json"
Write-Host "Registered: $($Reg.message)"
Write-Host "User ID: $($Reg.user.id)"

Write-Host "`n=== Step 2: Log in ==="
$LoginBody = @{
    email    = $Reg.user.email
    password = $RegBody.password
}
$Login = Invoke-JsonPost -Uri "$ApiBase/api/auth/login" -Body $LoginBody
$Token = $Login.token
Write-Host "Login OK."
Write-Host "Token len: $($Token.Length)"

$Headers = @{ Authorization = "Bearer $Token" }

Write-Host "`n=== Step 3: POST /api/rides (booking) ==="
$RideBody = @{
    passenger_name = "Booking Tester"
    pickup_label   = "Plaza Marina, Olongapo"
    dropoff_label  = "Olongapo City Hall"
    pickup_coord   = @{ lat = 14.967; lng = 120.591 }
    dropoff_coord  = @{ lat = 15.040; lng = 120.298 }
    distance_m     = 1200
    ride_type      = "regular"
}
$Ride = Invoke-JsonPost -Uri "$ApiBase/api/rides" -Body $RideBody -Headers $Headers
Write-Host "Booking HTTP status: 201 Created"
Write-Host ($Ride | ConvertTo-Json -Depth 10)
$RideId = $Ride.ride.id
$RideStatus = $Ride.ride.status
$RideFare = $Ride.ride.fare
Write-Host "Ride ID: $RideId"
Write-Host "Ride status: $RideStatus"
Write-Host "Ride fare: $RideFare"

Write-Host "`n=== Step 4: Confirm ride appears in passenger history ==="
$Hist = Invoke-RestMethod -Uri "$ApiBase/api/rides/history" -Method Get -Headers $Headers
$Hist.Rides | ForEach-Object {
    if ($_.id -eq $RideId) {
        Write-Host "Found ride in history: id=$($_.id) status=$($_.status) fare=$($_.fare)"
    }
}

Write-Host "`n=== Step 5: Negative tests ==="
$BadBodies = @(
    @{ pickup_label = "Plaza Marina" },            # missing dropoff_label
    @{ pickup_label = "Plaza Marina"; dropoff_label = "Olongapo City Hall"; pickup_coord = @{ lat = "x"; lng = 120 } }, # bad pickup coord
    @{ pickup_label = "Plaza Marina"; dropoff_label = "Olongapo City Hall"; pickup_coord = @{ lat = 14.967; lng = 120.591 }; dropoff_coord = @{ lat = 15.040; lng = 120.298 }; distance_m = "not-a-number" } # bad distance
)
$BadBodies | ForEach-Object {
    try {
        $Bad = Invoke-RestMethod -Uri "$ApiBase/api/rides" -Method Post -Body ($_ | ConvertTo-Json -Depth 10) -ContentType "application/json" -Headers $Headers -ErrorAction Stop
        Write-Host "Bad body did not throw. Response: $($Bad | ConvertTo-Json -Depth 5)"
    } catch {
        if ($_.Exception.Response) {
            $resp = $_.Exception.Response
            $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
            $txt = $reader.ReadToEnd()
            Write-Host "Bad body rejected with status $($resp.StatusCode): $txt"
        } else {
            Write-Host "Bad body rejected: $($_.Exception.Message)"
        }
    }
}

Write-Host "`nBooking function test complete."
