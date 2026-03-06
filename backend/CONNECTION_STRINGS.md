# MongoDB Connection String Quick Reference

## Common Connection String Formats

### 1. Local MongoDB (Default)
```
MONGODB_URL=mongodb://localhost:27017
```

### 2. Local MongoDB with Authentication
```
MONGODB_URL=mongodb://username:password@localhost:27017
```

### 3. MongoDB Atlas (Cloud)
```
MONGODB_URL=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### 4. MongoDB Atlas with Specific Options
```
MONGODB_URL=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=VoiceLogistics
```

### 5. MongoDB with Replica Set
```
MONGODB_URL=mongodb://host1:27017,host2:27017,host3:27017/?replicaSet=myReplicaSet
```

### 6. MongoDB Docker Container
```
MONGODB_URL=mongodb://host.docker.internal:27017
```

---

## Connection String Components

**Format:** `mongodb[+srv]://[username:password@]host[:port][/database][?options]`

- `mongodb://` - Standard connection
- `mongodb+srv://` - SRV connection (used by Atlas)
- `username:password` - Credentials (URL encode special characters!)
- `host` - Server hostname or IP
- `port` - Server port (default: 27017)
- `database` - Default database (optional)
- `options` - Query parameters

---

## Common Options

| Option | Description | Example |
|--------|-------------|---------|
| `retryWrites=true` | Retry write operations | Default for Atlas |
| `w=majority` | Write concern level | Ensures data persistence |
| `authSource=admin` | Authentication database | For custom auth DB |
| `maxPoolSize=50` | Connection pool size | Default is 100 |
| `ssl=true` | Enable SSL/TLS | Required for Atlas |

---

## Special Characters in Password

If your password contains special characters, URL-encode them:

| Character | URL-Encoded |
|-----------|-------------|
| @ | %40 |
| : | %3A |
| / | %2F |
| ? | %3F |
| # | %23 |
| [ | %5B |
| ] | %5D |
| % | %25 |

**Example:**
- Password: `myP@ss:word#123`
- Encoded: `myP%40ss%3Aword%23123`
- URL: `mongodb+srv://user:myP%40ss%3Aword%23123@cluster.mongodb.net/`

---

## Quick Setup Examples

### MongoDB Atlas Setup

1. **Create Cluster**
   - Go to cloud.mongodb.com
   - Click "Create" → "Shared" (Free tier)
   - Choose cloud provider and region
   - Click "Create Cluster"

2. **Create Database User**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Set username and password
   - Set permissions to "Read and write to any database"

3. **Whitelist IP Address**
   - Go to "Network Access"
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0) for testing
   - For production, add specific IPs

4. **Get Connection String**
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password

### Local MongoDB Setup (Windows)

```powershell
# Install MongoDB using Chocolatey
choco install mongodb

# Or download installer from mongodb.com

# Start MongoDB service
net start MongoDB

# Connection string
MONGODB_URL=mongodb://localhost:27017
```

### Local MongoDB Setup (Mac)

```bash
# Install using Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Connection string
MONGODB_URL=mongodb://localhost:27017
```

### Docker Setup

```bash
# Run MongoDB container
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Connection string
MONGODB_URL=mongodb://localhost:27017
```

---

## Testing Your Connection

Use the provided test script:

```bash
cd backend
python test_mongodb.py
```

You should see:
```
✅ Successfully connected to MongoDB!
✅ Write operation successful!
✅ Read operation successful!
✅ Cleanup successful!
✨ All tests passed! Your MongoDB setup is ready to use.
```

---

## Troubleshooting

### "Connection refused"
- MongoDB service is not running
- Wrong host/port in connection string
- Firewall blocking connection

### "Authentication failed"
- Wrong username/password
- Special characters not URL-encoded
- Wrong authSource specified

### "Network timeout"
- IP not whitelisted (for Atlas)
- Wrong connection string format
- Network/firewall issues

### "SSL/TLS error"
- Add `ssl=true` to connection string
- For self-signed certificates: `tlsAllowInvalidCertificates=true` (dev only!)

---

## Security Best Practices

1. ✅ **Never commit .env file to git**
   - Add `.env` to `.gitignore`
   - Use `.env.example` as template

2. ✅ **Use strong passwords**
   - At least 12 characters
   - Mix of letters, numbers, symbols
   - No dictionary words

3. ✅ **Limit network access**
   - Whitelist specific IPs in production
   - Don't use 0.0.0.0/0 in production

4. ✅ **Use environment variables**
   - Never hardcode credentials
   - Use different credentials for dev/prod

5. ✅ **Enable authentication**
   - Always use username/password
   - Consider role-based access control

6. ✅ **Use TLS/SSL**
   - Required for production
   - Atlas enforces this by default

---

## Need More Help?

- [MongoDB Connection Strings Docs](https://docs.mongodb.com/manual/reference/connection-string/)
- [MongoDB Atlas Getting Started](https://docs.atlas.mongodb.com/getting-started/)
- [Motor Documentation](https://motor.readthedocs.io/)
