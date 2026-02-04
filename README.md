# EarnKaro Affiliate Link Automation API

An Express.js API server that automates EarnKaro affiliate link generation using Puppeteer for browser automation. Simply POST a Flipkart/Myntra URL and receive an affiliate link.

## Features

- REST API for automated affiliate link generation
- Browser automation with Puppeteer
- Session persistence (reduces login frequency)
- Support for multiple e-commerce platforms
- Input validation and sanitization
- Graceful error handling

## Prerequisites

- Node.js v16 or higher
- An active EarnKaro account
- Valid EarnKaro email (phone number or email address)
- **Important:** EarnKaro uses SMS OTP verification for login

## Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
cp .env.example .env
```

4. Edit `.env` file and add your credentials:
```env
EARNKARO_EMAIL=your-email@example.com
PORT=3000
HEADLESS=false
```

**Note:** Set `HEADLESS=false` for the first run to complete OTP verification

## Usage

### Start the Server

**First Time Setup (OTP Verification):**

1. Start with `HEADLESS=false` to see the browser:
```bash
npm start
```

2. A Chrome window will open and navigate to EarnKaro login
3. The script will enter your email automatically
4. **You need to manually enter the OTP** received via SMS
5. Once logged in, the session will be saved automatically
6. Close the server (Ctrl+C)

**Subsequent Runs:**

After completing OTP once, you can use headless mode:
1. Set `HEADLESS=true` in `.env`
2. Start the server:
```bash
npm start
```

The saved session will be reused, avoiding repeated OTP verification.

For development with auto-restart:
```bash
npm run dev
```

### API Endpoints

#### Health Check
```bash
GET http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "service": "earnkaro-affiliate-api",
  "serviceReady": true
}
```

#### Convert Link
```bash
POST http://localhost:3000/convert
Content-Type: application/json

{
  "url": "https://www.flipkart.com/product/xyz"
}
```

Success Response (200):
```json
{
  "success": true,
  "affiliateLink": "https://earnkaro.com/ref/xyz123",
  "originalUrl": "https://www.flipkart.com/product/xyz",
  "domain": "flipkart.com"
}
```

Error Response (400/500):
```json
{
  "success": false,
  "error": "Invalid URL",
  "message": "Please provide a valid Flipkart or Myntra URL"
}
```

### Example with cURL

```bash
curl -X POST http://localhost:3000/convert \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.flipkart.com/some-product"}'
```

### Supported Domains

- flipkart.com
- myntra.com
- amazon.in
- ajio.com

More domains can be added in `utils/validator.js`

## Project Structure

```
earnkaro-affiliate-api/
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables (git-ignored)
├── .env.example              # Template for environment setup
├── .gitignore               # Git ignore rules
├── server.js                # Express API server
├── services/
│   └── earnkaroService.js   # Puppeteer automation logic
├── utils/
│   └── validator.js         # URL validation helpers
└── README.md                # Documentation
```

## Configuration

### Environment Variables

- `EARNKARO_EMAIL`: Your EarnKaro account email
- `EARNKARO_PASSWORD`: Your EarnKaro account password
- `PORT`: Server port (default: 3000)
- `HEADLESS`: Run browser in headless mode (true/false)

### Session Persistence

Browser sessions are stored in the `sessions/` directory to reduce login frequency. This directory is git-ignored for security.

## Troubleshooting

### Login Fails / OTP Required

EarnKaro uses SMS OTP verification. To set up:

1. Set `HEADLESS=false` in `.env`
2. Start the server - a browser window will open
3. The script will enter your email automatically
4. **Manually enter the OTP** when prompted
5. Wait for login to complete - the session will be saved
6. Stop the server and set `HEADLESS=true` for future runs
7. The saved session in `sessions/` directory allows future runs without OTP

### Selectors Not Found

If you see errors like "Could not find email input field":

1. EarnKaro's UI may have changed
2. Set `HEADLESS=false` in `.env` to see the browser
3. Inspect the actual HTML selectors on EarnKaro's website
4. Update selectors in `services/earnkaroService.js`

### Service Not Ready

Wait a few seconds after starting the server. The initialization process includes:
- Launching browser
- Navigating to EarnKaro
- Checking/performing login

Check `/health` endpoint to verify `serviceReady: true`

### Rate Limiting

If you get rate limited:
- Add delays between requests
- Reduce concurrent requests
- Consider implementing a queue system

## Security Notes

- **Never commit `.env` file** - it contains your credentials
- The `.env` file is already in `.gitignore`
- Keep your EarnKaro credentials secure
- Run in headless mode in production
- Consider implementing API authentication for production use

## Development

### Debug Mode

Set `HEADLESS=false` to see the browser automation in action:

```env
HEADLESS=false
```

### Adding New Domains

Edit `utils/validator.js` and add domains to `SUPPORTED_DOMAINS` array:

```javascript
const SUPPORTED_DOMAINS = [
  'flipkart.com',
  'myntra.com',
  'yournewdomain.com'  // Add here
];
```

## Known Limitations

- **No Official API**: Uses browser automation, which is slower than API calls
- **UI Dependencies**: Breaking if EarnKaro changes their UI
- **OTP/2FA**: May require manual intervention
- **Rate Limits**: Subject to EarnKaro's rate limiting

## Future Improvements

- [ ] Request queue for concurrent handling
- [ ] Caching for recently converted links
- [ ] Batch conversion endpoint
- [ ] Logging with winston/pino
- [ ] Unit tests
- [ ] Docker support
- [ ] API authentication

## Docker Deployment

For production deployment with persistent sessions, use Docker:

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions including:
- Docker Compose setup with persistent volumes
- Railway, Render, Fly.io deployment
- VPS deployment without Docker
- Session persistence strategies

## License

ISC

## Disclaimer

This tool is for personal use and automation. Ensure compliance with EarnKaro's Terms of Service. The authors are not responsible for any misuse or violations.
