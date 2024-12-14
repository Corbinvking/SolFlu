# SolFlu Translator Deployment Guide

## System Requirements

- Python 3.11+ (3.12 recommended)
- 2GB RAM minimum
- 1GB free disk space
- Linux/Windows/macOS

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/SolFlu.git
cd SolFlu/src/translator
```

### 2. Set Up Virtual Environment

#### Linux/macOS
```bash
python -m venv venv
source venv/bin/activate
```

#### Windows
```powershell
python -m venv venv
.\venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

## Configuration

### 1. Environment Variables

Create a `.env` file in the `src/translator` directory:

```env
# Server Configuration
HOST=0.0.0.0
PORT=8002
WORKERS=4
LOG_LEVEL=info

# Cache Configuration
CACHE_SIZE=1000
CACHE_TTL=3600

# API Configuration
ALLOW_ORIGINS=["*"]
MAX_REQUESTS_PER_MINUTE=1000
```

### 2. Logging Configuration

Logs are stored in the `logs` directory:
- Create the directory if it doesn't exist
- Ensure write permissions
- Configure log rotation if needed

## Running the Server

### Development

```bash
uvicorn api:app --reload --host 0.0.0.0 --port 8002
```

### Production

#### Using Uvicorn directly:
```bash
uvicorn api:app --host 0.0.0.0 --port 8002 --workers 4 --log-level info
```

#### Using Gunicorn (Linux/macOS):
```bash
gunicorn api:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8002
```

#### Using Systemd (Linux)

Create `/etc/systemd/system/solflu-translator.service`:

```ini
[Unit]
Description=SolFlu Translator API
After=network.target

[Service]
User=solflu
Group=solflu
WorkingDirectory=/path/to/SolFlu/src/translator
Environment="PATH=/path/to/SolFlu/src/translator/venv/bin"
ExecStart=/path/to/SolFlu/src/translator/venv/bin/uvicorn api:app --host 0.0.0.0 --port 8002 --workers 4

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl start solflu-translator
sudo systemctl enable solflu-translator
```

## Health Checks

Monitor the service using:

### 1. API Health Check
```bash
curl http://localhost:8002/health
```

### 2. Metrics
```bash
curl http://localhost:8002/metrics
```

### 3. Log Monitoring
```bash
tail -f logs/translator.log
tail -f logs/error.log
tail -f logs/performance.log
```

## Performance Tuning

### 1. Worker Configuration

Adjust workers based on CPU cores:
```python
workers = (2 * cpu_cores) + 1
```

### 2. Cache Settings

Modify `cache_size` based on memory:
- 1000 entries ≈ 10MB memory
- Increase for better performance
- Monitor hit rate via metrics

### 3. System Limits

#### Linux
Add to `/etc/security/limits.conf`:
```
solflu soft nofile 65535
solflu hard nofile 65535
```

#### Windows
Registry settings for concurrent connections:
```
HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters
  MaxUserPort = 65534
  TcpTimedWaitDelay = 30
```

## Monitoring

### 1. Prometheus Integration

Add to your Prometheus config:

```yaml
scrape_configs:
  - job_name: 'solflu-translator'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:8002']
```

### 2. Grafana Dashboard

Import the provided dashboard template:
- CPU/Memory usage
- Request rates
- Response times
- Cache performance
- Error rates

## Security

### 1. Firewall Configuration

Allow only necessary ports:
```bash
sudo ufw allow 8002/tcp
```

### 2. SSL/TLS

Use a reverse proxy (nginx/traefik) for SSL termination:

```nginx
server {
    listen 443 ssl;
    server_name api.solflu.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. Rate Limiting

Configure in nginx:

```nginx
limit_req_zone $binary_remote_addr zone=translator:10m rate=100r/s;

location / {
    limit_req zone=translator burst=20 nodelay;
    proxy_pass http://localhost:8002;
}
```

## Backup and Recovery

### 1. Log Rotation

Configure logrotate:

```
/path/to/SolFlu/src/translator/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 solflu solflu
}
```

### 2. Cache Persistence

Cache is in-memory only. No backup needed.

## Troubleshooting

### 1. Common Issues

#### High Response Times
- Check system resources
- Increase cache size
- Adjust worker count
- Monitor log files

#### High Error Rates
- Check error.log
- Verify network connectivity
- Monitor system resources
- Check API dependencies

### 2. Debug Mode

Enable debug logging:
```bash
uvicorn api:app --log-level debug
```

## Maintenance

### 1. Updates

```bash
git pull
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart solflu-translator
```

### 2. Health Checks

Set up monitoring for:
- API endpoint health
- System resources
- Log file sizes
- Error rates

### 3. Backup Strategy

- Log files: Daily rotation
- Configuration: Version control
- Metrics: Prometheus retention

## Support

For issues:
1. Check logs in `logs/` directory
2. Review documentation
3. Open GitHub issue
4. Contact support team 