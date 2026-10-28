import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { exec } from 'child_process'
import os from 'os'

// Custom Vite plugin for native Laptop and OS system control
function systemControlPlugin() {
  return {
    name: 'system-control-bridge',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, `http://${req.headers.host}`)

        // 1. Launch Application or URL Endpoint
        if (url.pathname === '/__api/launch-app') {
          const appName = url.searchParams.get('app') || 'notepad'
          const appCommands = {
            vscode: 'code',
            code: 'code',
            chrome: 'start chrome || start msedge',
            google: 'start https://google.com',
            browser: 'start chrome || start msedge',
            terminal: 'start wt || start powershell',
            powershell: 'start powershell',
            cmd: 'start cmd',
            notepad: 'notepad',
            calculator: 'calc',
            calc: 'calc',
            explorer: 'explorer',
            spotify: 'start spotify',
            taskmanager: 'taskmgr',
            taskmgr: 'taskmgr',
            youtube: 'start https://youtube.com',
            github: 'start https://github.com',
            devpost: 'start https://devpost.com',
          }

          let cmd = appCommands[appName.toLowerCase()]
          if (!cmd) {
            if (appName.startsWith('http://') || appName.startsWith('https://')) {
              cmd = `start "${appName}"`
            } else {
              cmd = `start ${appName}`
            }
          }

          exec(cmd, { shell: 'powershell.exe' }, (err) => {
            res.setHeader('Content-Type', 'application/json')
            if (err) {
              res.end(JSON.stringify({ success: false, error: err.message, app: appName }))
            } else {
              res.end(JSON.stringify({ success: true, app: appName }))
            }
          })
          return
        }

        // 2. Hardware & Volume Control Endpoint
        if (url.pathname === '/__api/volume-control') {
          const action = url.searchParams.get('action') || 'mute'
          let script = ''

          if (action === 'mute') {
            script = `(New-Object -ComObject WScript.Shell).SendKeys([char]173)`
          } else if (action === 'up') {
            script = `(New-Object -ComObject WScript.Shell).SendKeys([char]175); (New-Object -ComObject WScript.Shell).SendKeys([char]175)`
          } else if (action === 'down') {
            script = `(New-Object -ComObject WScript.Shell).SendKeys([char]174); (New-Object -ComObject WScript.Shell).SendKeys([char]174)`
          } else if (action === 'playpause') {
            script = `(New-Object -ComObject WScript.Shell).SendKeys([char]179)`
          }

          exec(script, { shell: 'powershell.exe' }, (err) => {
            res.setHeader('Content-Type', 'application/json')
            if (err) {
              res.end(JSON.stringify({ success: false, error: err.message, action }))
            } else {
              res.end(JSON.stringify({ success: true, action }))
            }
          })
          return
        }

        // 3. Power & Screenshot Endpoint
        if (url.pathname === '/__api/power-action') {
          const action = url.searchParams.get('action') || 'screenshot'
          let cmd = ''

          if (action === 'lock') {
            cmd = 'rundll32.exe user32.dll,LockWorkStation'
          } else if (action === 'screenshot' || action === 'snip') {
            cmd = 'start ms-screenclip:'
          } else if (action === 'sleep') {
            cmd = 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0'
          }

          exec(cmd, { shell: 'powershell.exe' }, (err) => {
            res.setHeader('Content-Type', 'application/json')
            if (err) {
              res.end(JSON.stringify({ success: false, error: err.message, action }))
            } else {
              res.end(JSON.stringify({ success: true, action }))
            }
          })
          return
        }

        // 4. Real System Telemetry Endpoint
        if (url.pathname === '/__api/system-telemetry') {
          const totalMem = Math.round(os.totalmem() / (1024 * 1024 * 1024))
          const freeMem = Math.round(os.freemem() / (1024 * 1024 * 1024))
          const usedMem = Math.max(1, totalMem - freeMem)
          const memPct = Math.round((usedMem / totalMem) * 100)
          const cpuCount = os.cpus().length
          const uptimeHours = (os.uptime() / 3600).toFixed(1)

          exec('powershell -Command "Get-CimInstance -ClassName Win32_Battery | Select-Object -ExpandProperty EstimatedChargeRemaining"', (err, stdout) => {
            const batteryLevel = stdout ? parseInt(stdout.trim()) : 85
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              platform: os.platform(),
              hostname: os.hostname(),
              cpu: `${cpuCount} Cores`,
              ram: `${usedMem}GB / ${totalMem}GB (${memPct}%)`,
              ramPercent: memPct,
              battery: isNaN(batteryLevel) ? 100 : batteryLevel,
              uptime: `${uptimeHours} hrs`,
            }))
          })
          return
        }

        next()
      })
    }
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), systemControlPlugin()],
  server: {
    port: 5174,
    strictPort: true,
    host: '127.0.0.1',
  },
})
