const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Read port from config.json
const configPath = path.join(__dirname, '../../config.json');
let port = 8000; // default port

try {
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.frontendPort) {
      port = config.frontendPort;
      console.log(`Using port ${port} from config.json`);
    } else {
      console.log(`No frontendPort found in config.json, using default port ${port}`);
    }
  } else {
    console.log(`config.json not found, using default port ${port}`);
  }
} catch (error) {
  console.warn(`Error reading config.json: ${error.message}, using default port ${port}`);
}

// Set PORT environment variable and start react-scripts
process.env.PORT = port.toString();

const reactScripts = spawn('react-scripts', ['start'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: port.toString() }
});

reactScripts.on('close', (code) => {
  process.exit(code);
});

