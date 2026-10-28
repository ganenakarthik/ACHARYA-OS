const { app, BrowserWindow, screen } = require('electron');
const fs = require('fs');

app.whenReady().then(() => {
  const d = screen.getPrimaryDisplay();
  const win = new BrowserWindow({
    width: 230,
    height: 56,
    x: 100,
    y: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true
  });
  
  const initial = win.getBounds();
  
  // Try expand
  const { x, y, width, height } = d.bounds;
  win.setBounds({ x, y, width, height });
  const afterSetBounds = win.getBounds();

  fs.writeFileSync('diag_result.json', JSON.stringify({
    displayBounds: d.bounds,
    workArea: d.workArea,
    scaleFactor: d.scaleFactor,
    initial,
    afterSetBounds
  }, null, 2));

  win.destroy();
  app.quit();
});
