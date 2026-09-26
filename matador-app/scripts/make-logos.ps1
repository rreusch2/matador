Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path (Split-Path -Parent $root) "Matador Logo Assets\transparent.png"
$out = Join-Path $root "assets\images"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$img = [System.Drawing.Bitmap]::FromFile($src)

# Find the bounding box of non-transparent pixels (sampled for speed, then refined)
$minX = $img.Width; $minY = $img.Height; $maxX = 0; $maxY = 0
$rect = New-Object System.Drawing.Rectangle 0, 0, $img.Width, $img.Height
$data = $img.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bytes = New-Object byte[] ($data.Stride * $img.Height)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
$img.UnlockBits($data)
for ($y = 0; $y -lt $img.Height; $y += 2) {
  $row = $y * $data.Stride
  for ($x = 0; $x -lt $img.Width; $x += 2) {
    if ($bytes[$row + $x * 4 + 3] -gt 20) {
      if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
$bw = $maxX - $minX + 2; $bh = $maxY - $minY + 2
Write-Host "Logo bbox: $minX,$minY ${bw}x$bh"

function Save-Tinted($name, $r, $g, $b, $targetW) {
  $scale = $targetW / $bw
  $w = [int]$targetW; $h = [int][Math]::Round($bh * $scale)
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gfx = [System.Drawing.Graphics]::FromImage($bmp)
  $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $cm = New-Object System.Drawing.Imaging.ColorMatrix
  $cm.Matrix00 = 0; $cm.Matrix11 = 0; $cm.Matrix22 = 0
  $cm.Matrix40 = $r / 255; $cm.Matrix41 = $g / 255; $cm.Matrix42 = $b / 255
  $attr = New-Object System.Drawing.Imaging.ImageAttributes
  $attr.SetColorMatrix($cm)
  $dest = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $gfx.DrawImage($img, $dest, $minX, $minY, $bw, $bh, [System.Drawing.GraphicsUnit]::Pixel, $attr)
  $gfx.Dispose()
  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "Saved $name (${w}x$h)"
}

Save-Tinted "logo-white.png" 255 255 255 1200
Save-Tinted "logo-yellow.png" 254 219 0 1200
Save-Tinted "logo-black.png" 0 0 0 1200

function Save-Icon($name, $size, $logoFrac, $bg, $r, $g, $b) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gfx = [System.Drawing.Graphics]::FromImage($bmp)
  $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  if ($bg) { $gfx.Clear($bg) } else { $gfx.Clear([System.Drawing.Color]::Transparent) }
  $w = [int]($size * $logoFrac); $h = [int]($w * $bh / $bw)
  $cm = New-Object System.Drawing.Imaging.ColorMatrix
  $cm.Matrix00 = 0; $cm.Matrix11 = 0; $cm.Matrix22 = 0
  $cm.Matrix40 = $r / 255; $cm.Matrix41 = $g / 255; $cm.Matrix42 = $b / 255
  $attr = New-Object System.Drawing.Imaging.ImageAttributes
  $attr.SetColorMatrix($cm)
  $dest = New-Object System.Drawing.Rectangle ([int](($size - $w) / 2)), ([int](($size - $h) / 2)), $w, $h
  $gfx.DrawImage($img, $dest, $minX, $minY, $bw, $bh, [System.Drawing.GraphicsUnit]::Pixel, $attr)
  $gfx.Dispose()
  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "Saved $name"
}

Save-Icon "icon.png" 1024 0.62 ([System.Drawing.Color]::Black) 254 219 0
Save-Icon "adaptive-icon.png" 1024 0.5 $null 254 219 0
Save-Icon "splash-icon.png" 1024 1.0 $null 255 255 255
Save-Icon "favicon.png" 96 0.8 ([System.Drawing.Color]::Black) 254 219 0

$img.Dispose()
