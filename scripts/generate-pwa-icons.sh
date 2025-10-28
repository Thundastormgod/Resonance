#!/bin/bash

# Create temporary placeholder PWA icons
# These will work until you add your branded logos

echo "Creating placeholder PWA icons..."

# Create a simple HTML file to generate canvas-based PNG icons
cat > /tmp/generate-icons.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>Icon Generator</title></head>
<body>
<canvas id="canvas192" width="192" height="192"></canvas>
<canvas id="canvas512" width="512" height="512"></canvas>
<script>
function createIcon(canvasId, size) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  
  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#000000');
  gradient.addColorStop(1, '#1e3a8a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // White "R" text
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('R', size / 2, size / 2);
  
  // Download
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pwa-icon-${size}.png`;
    a.click();
  });
}

createIcon('canvas192', 192);
setTimeout(() => createIcon('canvas512', 512), 100);
</script>
</body>
</html>
EOF

echo "✅ HTML icon generator created at /tmp/generate-icons.html"
echo ""
echo "📱 To create placeholder icons:"
echo "1. Open /tmp/generate-icons.html in your browser"
echo "2. Two PNG files will download automatically"
echo "3. Move them to: /Users/startferanmi/Data-Scientist/Resonance/public/"
echo ""
echo "Or simply skip this - the PWA will work without icons (just won't look as nice)"
