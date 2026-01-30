# Cloudflare WAF Configuration Guide

This document describes the Web Application Firewall (WAF) rules and configuration for the SVG API production deployment.

## Table of Contents

- [Overview](#overview)
- [Managed Rulesets](#managed-rulesets)
- [Custom Rules](#custom-rules)
- [Rate Limiting Rules](#rate-limiting-rules)
- [Bot Management](#bot-management)
- [IP Access Rules](#ip-access-rules)
- [Custom Error Pages](#custom-error-pages)
- [Monitoring and Alerts](#monitoring-and-alerts)

## Overview

The SVG API uses Cloudflare's WAF to protect against common web vulnerabilities, DDoS attacks, and malicious traffic. This configuration provides defense in depth alongside application-level security controls.

### Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ DDoS Protection │ │ WAF Rules   │  │ Bot Management      │ │
│  │ (L3/L4/L7)      │ │ (OWASP/Core)│  │ (ML-based detection)│ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Worker Runtime                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Rate Limiting   │ │ Input Validation│  │ Auth & Signing      │ │
│  │ (Tier-based)    │ │ (XSS/SQLi)      │  │ (HMAC/Signatures)   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Managed Rulesets

### 1. Cloudflare Managed Ruleset

**Priority:** 1
**Action:** Block

Enable all rule groups:

| Rule Group | Action | Description |
|------------|--------|-------------|
| Cloudflare Specials | Block | Cloudflare-specific vulnerabilities |
| Cloudflare Misc | Block | Miscellaneous attack vectors |
| Cloudflare Laravel | Block | Laravel-specific protections |
| Cloudflare Drupal | Block | Drupal-specific protections |
| Cloudflare WordPress | Block | WordPress-specific protections |
| Cloudflare PHP | Block | PHP-specific protections |

### 2. OWASP Core Ruleset

**Priority:** 2
**Paranoia Level:** 2 (Production) / 1 (Development)

```json
{
  "id": " OwaspCrsId",
  "action": "block",
  "score_threshold": 25,
  "paranoia_level": 2
}
```

**Sensitivity Levels:**

| Paranoia Level | Use Case | Score Threshold |
|----------------|----------|-----------------|
| 1 | Low sensitivity, fewer false positives | 60 |
| 2 | Balanced (recommended for production) | 25 |
| 3 | High sensitivity, more false positives | 15 |
| 4 | Maximum sensitivity | 5 |

### 3. Exposed Credentials Check

**Priority:** 3
**Action:** Log

Monitor for credentials that have been exposed in data breaches.

### 4. Cloudflare Sensitive Data Detection

**Priority:** 4
**Action:** Log

Detect and log sensitive data in responses (PII, API keys, etc.).

## Custom Rules

### Rule 1: Block Known Bad IPs

**Expression:**
```
(ip.src in $blocked_ips)
```

**Action:** Block
**Priority:** 1

**List Management:**
```bash
# Add IP to block list
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/rules/lists/{list_id}/items" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '[{"ip": "192.0.2.1", "comment": "Malicious scanner"}]'
```

### Rule 2: Geographic Restrictions (Optional)

**Expression:**
```
(ip.geoip.country in {"CN" "RU" "KP" "IR"})
```

**Action:** Block (or Challenge)
**Priority:** 2

### Rule 3: API Path Protection

**Expression:**
```
(http.request.uri.path contains "/api/") and (http.request.method eq "POST") and not (http.request.headers.names contains "content-type")
```

**Action:** Block
**Priority:** 3

### Rule 4: Block Suspicious User Agents

**Expression:**
```
(http.user_agent contains "sqlmap") or
(http.user_agent contains "nikto") or
(http.user_agent contains "nmap") or
(http.user_agent contains "masscan") or
(http.user_agent contains "zgrab") or
(http.user_agent contains "gobuster") or
(http.user_agent contains "dirbuster") or
(http.user_agent contains "wfuzz")
```

**Action:** Block
**Priority:** 4

### Rule 5: SVG Upload Validation

**Expression:**
```
(http.request.uri.path contains "/api/v1/upload") and
(http.request.body.size > 1048576)
```

**Action:** Block
**Priority:** 5

### Rule 6: Enforce HTTPS in Production

**Expression:**
```
(not ssl) and (http.host eq "api.svgapi.com")
```

**Action:** Redirect (301 to HTTPS)
**Priority:** 6

### Rule 7: CORS Preflight Bypass Protection

**Expression:**
```
(http.request.method eq "OPTIONS") and
(http.request.headers.names contains "x-api-key")
```

**Action:** Block
**Priority:** 7

## Rate Limiting Rules

### Rule 1: General API Rate Limiting

**Expression:**
```
(http.request.uri.path contains "/api/")
```

**Configuration:**
```yaml
Requests: 100
Period: 60 seconds
Action: Block (429)
Duration: 60 seconds
Mitigation Timeout: 600 seconds
```

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
Retry-After: 60
```

### Rule 2: Search Endpoint Protection

**Expression:**
```
(http.request.uri.path contains "/api/v1/search")
```

**Configuration:**
```yaml
Requests: 30
Period: 60 seconds
Action: Block (429)
Duration: 60 seconds
Mitigation Timeout: 300 seconds
```

### Rule 3: Batch Endpoint Protection

**Expression:**
```
(http.request.uri.path contains "/api/v1/batch")
```

**Configuration:**
```yaml
Requests: 10
Period: 60 seconds
Action: Block (429)
Duration: 60 seconds
Mitigation Timeout: 300 seconds
```

### Rule 4: Health Check Abuse Prevention

**Expression:**
```
(http.request.uri.path eq "/health")
```

**Configuration:**
```yaml
Requests: 10
Period: 60 seconds
Action: Block (429)
Duration: 60 seconds
Mitigation Timeout: 300 seconds
```

### Rule 5: Aggressive Rate Limiting by IP

**Expression:**
```
(http.request.uri.path contains "/api/")
```

**Configuration (Advanced):**
```yaml
# Trigger when more than 1000 requests in 10 minutes
Requests: 1000
Period: 600 seconds

# Counting criteria
counting_expression: |
  (http.request.uri.path contains "/api/") and
  (not http.request.headers.names contains "x-api-key")

Action: Block (429)
Duration: 3600 seconds (1 hour)
Mitigation Timeout: 3600 seconds
```

## Bot Management

### Configuration

```json
{
  "fight_mode": true,
  "auto_update_model": true,
  "enable_js_detection": true,
  "suppress_session_score": false,
  "certain_bot_score": 1,
  "likely_bot_score": 20,
  "likely_human_score": 80,
  "certain_human_score": 99
}
```

### Bot Fight Mode Rules

**Expression:**
```
(cf.bot_management.score lt 30) and
(http.request.uri.path contains "/api/") and
(not http.request.headers.names contains "x-api-key")
```

**Action:** Managed Challenge
**Priority:** 10

### Verified Bot Allowlist

Allow legitimate search engines and monitoring services:

```
cf.bot_management.verified_bot eq true
```

**Action:** Skip
**Priority:** 1

## IP Access Rules

### Allowlist: Internal IPs

| Type | Value | Action | Notes |
|------|-------|--------|-------|
| IP | 203.0.113.0/24 | Allow | Office network |
| IP | 198.51.100.10 | Allow | Monitoring server |

### Blocklist: Known Attackers

| Type | Value | Action | Notes |
|------|-------|--------|-------|
| IP | 192.0.2.100 | Block | Known scanner |
| IP | 192.0.2.101 | Block | DDoS participant |
| ASN | 64496 | Block | Hosting provider with abuse |

## Custom Error Pages

### 429 Rate Limited

```html
<!DOCTYPE html>
<html>
<head>
    <title>Rate Limit Exceeded</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        h1 { color: #e74c3c; }
        .code { background: #f4f4f4; padding: 15px; border-radius: 5px; font-family: monospace; }
    </style>
</head>
<body>
    <h1>429 - Too Many Requests</h1>
    <p>You have exceeded the rate limit for this API endpoint.</p>
    <div class="code">
        Error Code: RATE_LIMIT_EXCEEDED<br>
        Retry After: ::RAY_ID::<br>
        Request ID: ::CLIENT_REQUEST_ID::
    </div>
    <p>Please reduce your request rate or upgrade your API plan.</p>
    <p><a href="https://docs.svgapi.com/rate-limits">Learn more about rate limits</a></p>
</body>
</html>
```

### 403 Forbidden

```html
<!DOCTYPE html>
<html>
<head>
    <title>Access Forbidden</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        h1 { color: #e74c3c; }
    </style>
</head>
<body>
    <h1>403 - Forbidden</h1>
    <p>Your request has been blocked by our security systems.</p>
    <p>If you believe this is an error, please contact support with your Ray ID: ::RAY_ID::</p>
</body>
</html>
```

## Monitoring and Alerts

### Security Events Dashboard

Monitor these metrics in Cloudflare Analytics:

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Blocked Requests/sec | > 100 | PagerDuty High |
| Rate Limited IPs | > 50 unique/min | Slack #security |
| Bot Score < 30 | > 10% of traffic | Email |
| WAF Rule Triggers | > 1000/hour | Slack #ops |

### Logpush Configuration

```json
{
  "name": "security-logs",
  "destination_conf": "s3://my-bucket/security-logs?region=us-east-1",
  "dataset": "firewall_events",
  "logpull_options": "fields=Action,ClientIP,ClientRequestHost,ClientRequestMethod,ClientRequestURI,Datetime,EdgeResponseStatus,RayID,RuleID,Source&timestamps=rfc3339",
  "frequency": "high"
}
```

### Sample Log Entry

```json
{
  "Action": "block",
  "ClientIP": "192.0.2.1",
  "ClientRequestHost": "api.svgapi.com",
  "ClientRequestMethod": "GET",
  "ClientRequestURI": "/api/v1/icon/../../../etc/passwd",
  "Datetime": "2025-01-30T12:34:56Z",
  "EdgeResponseStatus": 403,
  "RayID": "1a2b3c4d5e6f7g8h",
  "RuleID": "100173",
  "Source": "waf"
}
```

## Deployment

### Terraform Configuration

```hcl
resource "cloudflare_ruleset" "waf_custom_rules" {
  zone_id = var.zone_id
  name    = "SVG API WAF Rules"
  kind    = "zone"
  phase   = "http_request_firewall_custom"

  rules {
    action      = "block"
    expression  = "(ip.src in $blocked_ips)"
    description = "Block known bad IPs"
    enabled     = true
  }

  rules {
    action      = "block"
    expression  = "(http.user_agent contains \"sqlmap\")"
    description = "Block SQLMap scanner"
    enabled     = true
  }
}

resource "cloudflare_rate_limit" "api_general" {
  zone_id   = var.zone_id
  threshold = 100
  period    = 60

  match {
    request {
      url_pattern = "*/api/*"
      schemes     = ["HTTPS"]
    }
  }

  action {
    mode    = "ban"
    timeout = 60
  }
}
```

### wrangler.toml Integration

```toml
[env.production]
# WAF is configured via Cloudflare Dashboard or API
# These vars are used by the Worker for additional checks
vars = { ENVIRONMENT = "production", RATE_LIMIT_RPS = "1000" }
```

## Incident Response

### Emergency Block

To immediately block an attacking IP:

```bash
# Via API
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/firewall/access_rules/rules" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "block",
    "configuration": { "target": "ip", "value": "192.0.2.100" },
    "notes": "Emergency block - DDoS attack"
  }'
```

### Rate Limit Override

Temporarily increase rate limits during traffic spikes:

```bash
# Update rate limit rule
curl -X PUT "https://api.cloudflare.com/client/v4/zones/{zone_id}/rate_limits/{rule_id}" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "threshold": 200,
    "period": 60,
    "action": { "mode": "simulate" }
  }'
```

## Best Practices

1. **Start in Simulate Mode**: Deploy new rules in "log" mode before enabling block
2. **Monitor False Positives**: Review blocked requests weekly
3. **Update IP Lists**: Maintain accurate allowlists and blocklists
4. **Rate Limit Tuning**: Adjust thresholds based on legitimate traffic patterns
5. **Regular Audits**: Review WAF rules quarterly for relevance
6. **Defense in Depth**: WAF is the first line; application-level validation is essential

## References

- [Cloudflare WAF Documentation](https://developers.cloudflare.com/waf/)
- [Cloudflare Rate Limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/)
- [Cloudflare Bot Management](https://developers.cloudflare.com/bots/)
- [OWASP Core Rule Set](https://coreruleset.org/)
