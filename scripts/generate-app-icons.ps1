$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot

function New-Dir($path) {
  if (-not (Test-Path $path)) {
    New-Item -ItemType Directory -Force -Path $path | Out-Null
  }
}

function New-RoundRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Save-Png($bitmap, $path) {
  New-Dir (Split-Path -Parent $path)
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

function Draw-Logo($size, $path, [switch]$Round, [switch]$ForegroundOnly) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $s = [float]$size
  if (-not $ForegroundOnly) {
    $bgPath = if ($Round) {
      $circle = [System.Drawing.Drawing2D.GraphicsPath]::new()
      $circle.AddEllipse(0, 0, $s, $s)
      $circle
    } else {
      New-RoundRect 0 0 $s $s ($s * 0.265)
    }
    $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
      [System.Drawing.RectangleF]::new(0, 0, $s, $s),
      [System.Drawing.ColorTranslator]::FromHtml('#f7c98d'),
      [System.Drawing.ColorTranslator]::FromHtml('#5fa07e'),
      135
    )
    $graphics.FillPath($bgBrush, $bgPath)
    $veilBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(64, 255, 250, 239))
    $graphics.FillEllipse($veilBrush, $s * 0.18, $s * 0.1, $s * 0.72, $s * 0.58)
    $veilBrush.Dispose()
    $bgBrush.Dispose()
    $bgPath.Dispose()
  }

  # Keep the first checklist mark, with calmer breathing room inside the app icon.
  $markScale = 0.68
  $graphics.TranslateTransform($s / 2, $s / 2)
  $graphics.ScaleTransform($markScale, $markScale)
  $graphics.TranslateTransform(-$s / 2, -$s / 2)

  $shadow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(38, 45, 73, 55))
  $paperShadow = New-RoundRect ($s * 0.265) ($s * 0.205 + $s * 0.018) ($s * 0.48) ($s * 0.64) ($s * 0.15)
  $graphics.FillPath($shadow, $paperShadow)
  $paperShadow.Dispose()
  $shadow.Dispose()

  $paper = New-RoundRect ($s * 0.25) ($s * 0.185) ($s * 0.49) ($s * 0.64) ($s * 0.15)
  $paperBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    [System.Drawing.RectangleF]::new($s * 0.25, $s * 0.185, $s * 0.49, $s * 0.64),
    [System.Drawing.ColorTranslator]::FromHtml('#fffaf0'),
    [System.Drawing.ColorTranslator]::FromHtml('#f4e5d0'),
    90
  )
  $graphics.FillPath($paperBrush, $paper)
  $graphics.DrawPath([System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(230, 255, 253, 247), [Math]::Max(1, $s * 0.012)), $paper)
  $paperBrush.Dispose()

  $foldPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(112, 154, 130, 102), [Math]::Max(1.4, $s * 0.017))
  $foldPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $foldPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $foldPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.DrawLines($foldPen, [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new($s * 0.60, $s * 0.19),
    [System.Drawing.PointF]::new($s * 0.60, $s * 0.33),
    [System.Drawing.PointF]::new($s * 0.72, $s * 0.39)
  ))
  $foldPen.Dispose()

  $dotPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(238, 255, 248, 236), [Math]::Max(1, $s * 0.009))
  $dot1 = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#f0b268'))
  $dot2 = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#7ab88c'))
  $dotEntries = @(
    [pscustomobject]@{ X = $s * 0.37; Y = $s * 0.38; Brush = $dot1 },
    [pscustomobject]@{ X = $s * 0.37; Y = $s * 0.52; Brush = $dot2 }
  )
  foreach ($entry in $dotEntries) {
    $r = $s * 0.043
    $graphics.FillEllipse($entry.Brush, $entry.X - $r, $entry.Y - $r, $r * 2, $r * 2)
    $graphics.DrawEllipse($dotPen, $entry.X - $r, $entry.Y - $r, $r * 2, $r * 2)
  }
  $dot1.Dispose()
  $dot2.Dispose()
  $dotPen.Dispose()

  $linePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(190, 93, 115, 94), [Math]::Max(2, $s * 0.022))
  $linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($linePen, $s * 0.48, $s * 0.38, $s * 0.62, $s * 0.38)
  $graphics.DrawLine($linePen, $s * 0.48, $s * 0.52, $s * 0.68, $s * 0.52)
  $linePen.Dispose()

  $checkPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#4f8d73'), [Math]::Max(3, $s * 0.04))
  $checkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $checkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $checkPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.DrawLines($checkPen, [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new($s * 0.36, $s * 0.67),
    [System.Drawing.PointF]::new($s * 0.46, $s * 0.76),
    [System.Drawing.PointF]::new($s * 0.67, $s * 0.50)
  ))
  $checkPen.Dispose()

  $leaf = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $leaf.AddBezier($s * 0.71, $s * 0.68, $s * 0.85, $s * 0.63, $s * 0.89, $s * 0.50, $s * 0.86, $s * 0.42)
  $leaf.AddBezier($s * 0.75, $s * 0.43, $s * 0.67, $s * 0.52, $s * 0.66, $s * 0.64, $s * 0.71, $s * 0.68)
  $leaf.CloseFigure()
  $leafBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    [System.Drawing.RectangleF]::new($s * 0.64, $s * 0.41, $s * 0.27, $s * 0.3),
    [System.Drawing.ColorTranslator]::FromHtml('#8bd0a3'),
    [System.Drawing.ColorTranslator]::FromHtml('#4f8d73'),
    135
  )
  $graphics.FillPath($leafBrush, $leaf)
  $graphics.DrawPath([System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(220, 255, 248, 236), [Math]::Max(1, $s * 0.009)), $leaf)
  $leafBrush.Dispose()
  $leaf.Dispose()
  $paper.Dispose()

  $graphics.Dispose()
  Save-Png $bitmap $path
}

function Draw-Splash($size, $path) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#fbf4e9'))
  $tmp = Join-Path $env:TEMP "shiguang-icon-$size.png"
  Draw-Logo ([int]($size * 0.15)) $tmp
  $icon = [System.Drawing.Image]::FromFile($tmp)
  $x = ($size - $icon.Width) / 2
  $y = ($size - $icon.Height) / 2
  $graphics.DrawImage($icon, $x, $y, $icon.Width, $icon.Height)
  $icon.Dispose()
  Remove-Item -LiteralPath $tmp -Force
  $graphics.Dispose()
  Save-Png $bitmap $path
}

Draw-Logo 512 (Join-Path $root 'public\icon-512.png')
Draw-Logo 192 (Join-Path $root 'public\icon-192.png')
Draw-Logo 180 (Join-Path $root 'public\apple-touch-icon.png')

$densities = @{
  'mipmap-mdpi' = 48
  'mipmap-hdpi' = 72
  'mipmap-xhdpi' = 96
  'mipmap-xxhdpi' = 144
  'mipmap-xxxhdpi' = 192
}

foreach ($density in $densities.Keys) {
  $size = $densities[$density]
  $dir = Join-Path $root "android\app\src\main\res\$density"
  Draw-Logo $size (Join-Path $dir 'ic_launcher.png')
  Draw-Logo $size (Join-Path $dir 'ic_launcher_round.png') -Round
  Draw-Logo ([int]($size * 2.25)) (Join-Path $dir 'ic_launcher_foreground.png') -ForegroundOnly
}

Draw-Logo 1024 (Join-Path $root 'ios\App\App\Assets.xcassets\AppIcon.appiconset\AppIcon-512@2x.png')

$splashTargets = @(
  'android\app\src\main\res\drawable\splash.png',
  'android\app\src\main\res\drawable-land-mdpi\splash.png',
  'android\app\src\main\res\drawable-land-hdpi\splash.png',
  'android\app\src\main\res\drawable-land-xhdpi\splash.png',
  'android\app\src\main\res\drawable-land-xxhdpi\splash.png',
  'android\app\src\main\res\drawable-land-xxxhdpi\splash.png',
  'android\app\src\main\res\drawable-port-mdpi\splash.png',
  'android\app\src\main\res\drawable-port-hdpi\splash.png',
  'android\app\src\main\res\drawable-port-xhdpi\splash.png',
  'android\app\src\main\res\drawable-port-xxhdpi\splash.png',
  'android\app\src\main\res\drawable-port-xxxhdpi\splash.png'
)

foreach ($target in $splashTargets) {
  Draw-Splash 1024 (Join-Path $root $target)
}

Draw-Splash 2732 (Join-Path $root 'ios\App\App\Assets.xcassets\Splash.imageset\splash-2732x2732.png')
Draw-Splash 2732 (Join-Path $root 'ios\App\App\Assets.xcassets\Splash.imageset\splash-2732x2732-1.png')
Draw-Splash 2732 (Join-Path $root 'ios\App\App\Assets.xcassets\Splash.imageset\splash-2732x2732-2.png')

Write-Output 'Shiguang icons generated.'
