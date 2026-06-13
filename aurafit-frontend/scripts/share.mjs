import ngrok from '@ngrok/ngrok'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Read NGROK_AUTHTOKEN from .env
let authtoken = process.env.NGROK_AUTHTOKEN
if (!authtoken) {
  try {
    const env = readFileSync(resolve(__dirname, '../.env'), 'utf8')
    const match = env.match(/^NGROK_AUTHTOKEN=(.+)$/m)
    if (match) authtoken = match[1].trim()
  } catch { /* .env not found */ }
}

if (!authtoken || authtoken === 'paste_your_ngrok_authtoken_here') {
  console.error('\n❌  NGROK_AUTHTOKEN missing.')
  console.error('    1. Sign up free at https://ngrok.com')
  console.error('    2. Copy your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken')
  console.error('    3. Add it to aurafit-frontend/.env:')
  console.error('       NGROK_AUTHTOKEN=your_token_here\n')
  process.exit(1)
}

console.log('\n🚀  Starting ngrok tunnel on port 5173...')

const listener = await ngrok.forward({
  addr: 5173,
  authtoken,
})

const url = listener.url()

console.log('\n' + '─'.repeat(60))
console.log(`  🌐  Public URL:  ${url}`)
console.log('─'.repeat(60))
console.log('\n  ✅  Steps to activate:')
console.log(`  1. Go to: https://console.cloud.google.com/apis/credentials`)
console.log(`  2. Edit your OAuth 2.0 Client ID`)
console.log(`  3. Add to Authorized JavaScript origins:`)
console.log(`       ${url}`)
console.log(`  4. Save — takes ~30 seconds to propagate`)
console.log(`  5. Open  ${url}  on any device\n`)
console.log('  Press Ctrl+C to stop the tunnel.\n')

process.on('SIGINT', async () => {
  console.log('\n  Closing tunnel...')
  await ngrok.disconnect()
  process.exit(0)
})

// Keep the event loop alive until Ctrl+C
setInterval(() => {}, 1 << 30)
