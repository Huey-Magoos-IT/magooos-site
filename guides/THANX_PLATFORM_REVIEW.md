# Thanx Platform Review

Full technical review of the Thanx loyalty platform based on their public documentation at docs.thanx.com. This covers what they offer, what fits our stack, and what needs answers before we commit.

---

## What Looks Good

* **PCI DSS Level 1 and SOC 2 Type 2 compliance.** That's the standard you'd want from anyone handling customer and payment data.

* **Public documented API at docs.thanx.com.** We already call external APIs through our API Gateway and Lambda, so adding another one fits our existing pattern. They provide Postman collections for every integration type (Consumer API, Partner API, Loyalty API, POS/Kiosk, Custom Apps/Web) with pre-filled sample credentials you swap out once you have sandbox access.

* **AWS-native infrastructure with PrivateLink support.** We're already fully on AWS so this is a natural fit. The Loyalty API specifically documents PrivateLink, which would let our VPC connect to their API over a private network connection instead of the public internet.

* **Terraform-managed infra and Datadog observability.** Shows operational maturity.

* **Cloudflare edge security.** Only Cloudflare traffic reaches their load balancer, which is solid security practice.

* **Data exports exist and work with our pipeline.** Two options:
  - **SFTP Exports** — Free. CSV snapshots updated every 24 hours. Multi-file format (no record cap, splits into up to 5GB files) is recommended for automated pipelines. Lambda picks up the CSVs, processes them, outputs to the reporting bucket. Same pattern we already run.
  - **Thanx Connex** — $300/month per destination. Fully managed, loads structured data directly into AWS S3 (also supports Redshift, Athena, BigQuery, Snowflake, Databricks, Postgres, MySQL). Thanx manages schema creation, ongoing syncing, and schema changes. 24-hour sync cycle. Cleaner than SFTP, but has a cost.
  - **Available data models:** Campaigns, Communication Preferences, Memberships, NPS Feedback, Points Accounts, Points Transactions, Programs, Purchases, and Rewards.

* **Webhooks are real-time and straightforward.** Five event types: Purchases, Reward Issued, Reward Batch Completed, Communication Settings, and SMS Subscriptions. Fire as POST requests to an HTTPS endpoint we register. Verified via `X-Thanx-Signature` (HMAC-SHA256 with shared secret) — standard, easy to validate in Lambda.

* **Structured support model.** Two named teams: a Partnerships Team (project concierge, handles scoping, GTM, escalation) and a Developer Support Team (technical guide, sandbox credentials, certification reviews). Contact is developer.support@thanx.com and partnerships@thanx.com. Not ticket-only — they do check-ins, Q&A sessions during development, and a video call certification review before go-live.

* **Certification is per integration type, not per location.** You demo the integration on a video call, walk through every supported use case (auth, reward lookup, basket submission, redemption flows, error handling), and provide a test environment. Once certified for a use case, launching new merchants on that same integration does not require re-certification. That matters with 78 locations — do it once, not 78 times.

* **Loyalty API is intentionally minimal.** Two endpoints: `GET /account` (user's rewards, points balance, available points products) and `POST /baskets` (submit a basket, apply discounts, trigger points accrual). Built for POS/ordering systems to do one job cleanly.

---

## Concerns

* **They're in US-East-1, we're in US-East-2.** Our entire stack (API Gateway, Lambda, Cognito, RDS, DynamoDB, S3) all lives in US-East-2. Thanx runs exclusively in US-East-1. Not a dealbreaker, but cross-region API calls add ~10-20ms latency per request. If we wanted to use PrivateLink it would need to be set up cross-region, which adds complexity. If US-East-1 has a regional outage, their entire platform goes down. No mention of multi-region failover or disaster recovery in their docs. We'd have to ask them.

* **Webhooks have no automatic retries.** If our endpoint goes down and misses a webhook, there's no replay. They explicitly say missed data should be collected via the SFTP/Connex bulk exports as a backfill. That means our real-time path needs a recovery plan — likely a reconciliation job that runs against the daily export to catch anything the webhooks missed.

* **Auth requires their SSO flow.** The Consumer API uses OAuth (Acquire Auth Code, then Acquire Access Token). Our existing Cognito auth would need to hand off to or wrap around Thanx's SSO, not replace it. Users authenticate through Thanx's flow. This is the piece most likely to create friction with our current setup. The specific question to ask: "We already have Cognito managing auth for our users — how does your SSO layer interact with that?"

* **Consumer API must be proxied through our server.** They explicitly say credentials should never be used in an app build and all calls should be proxied through your own server. So Lambda (or whatever backend) handles those proxied calls. Given we're already running Lambda behind API Gateway, that fits our existing pattern, but it's another integration surface to build and maintain.

* **Location mapping needs to be automated.** Every basket submission requires a Thanx `location_uid`. They provide a `Get Locations` endpoint to map our internal location IDs to theirs. With 78 locations, that mapping needs to be automated and kept in sync — they flag this as recommended best practice, not optional.

* **Loyalty model choice is permanent per merchant.** Card-linked (passive, works through enrolled payment cards, US-only) or check-in (requires guest identification at register via phone/email/QR). Can only pick one per merchant, and it determines the integration path. Card-linked needs card management endpoints; check-in needs the QR check-in code endpoint. This is a business decision that needs to be locked in before building.

* **Partner API rate limits are modest.** 5 requests/second and 2,000 requests per 15 minutes, with exponential backoff recommended. Higher limits are available on request. Fine for normal operations, but if we ever need a bulk sync or migration, we'd need to coordinate with them for higher limits.

* **~30 engineers covering a wide scope.** They have about 30 engineers managing loyalty, ordering, marketing automation, mobile apps, AI, and infrastructure. No dedicated DevOps or security team — they frame it as "full-stack ownership." Not a red flag on its own, but worth understanding what their support model and incident response look like on our end.

* **Cloudflare is their only edge provider.** Good for security, but it means a Cloudflare outage takes down all of Thanx. Worth being aware of.

---

## Questions to Ask Thanx Before Committing

1. **Disaster recovery / multi-region:** Do you have failover outside US-East-1? What's your RTO/RPO for a regional outage?
2. **Cognito integration:** We run Cognito for user auth. How does your SSO/OAuth flow coexist with an existing identity provider?
3. **Webhook reliability:** Beyond the SFTP backfill, is there a way to request replay of missed webhooks or query for events we didn't receive?
4. **SFTP vs Connex for S3:** Is the $300/month Connex fee the only path to native S3 delivery, or can the SFTP export be pointed at an S3-backed SFTP endpoint?
5. **PrivateLink cross-region:** Has anyone set up PrivateLink from US-East-2 to your US-East-1 endpoint? Any gotchas?
6. **Rate limit increases:** What does the process look like for temporarily increasing Partner API rate limits during bulk operations or migrations?
7. **Loyalty model recommendation:** For a QSR chain with 78 locations and an existing web ordering platform, which loyalty model do you typically recommend — card-linked or check-in?

---

## Integration Architecture (How It Would Fit Our Stack)

```
[Customer Browser]
        |
  [CloudFront / Our CDN]
        |
  [API Gateway (US-East-2)]
        |
  [Lambda (US-East-2)]
        |
        +-- [Cognito] — Our user auth
        +-- [RDS / DynamoDB] — Our data
        +-- [Thanx Consumer API (US-East-1)] — Loyalty lookups, basket submissions
        +-- [Thanx Partner API (US-East-1)] — Backend operations, user management
        |
  [Thanx Webhooks] --> [API Gateway] --> [Lambda] --> [S3 / DynamoDB]
        |
  [Thanx SFTP Export or Connex] --> [S3 Data Lake] --> [Lambda] --> [Reporting Bucket]
```

**Real-time path:** Webhooks fire on purchases and reward events, hit our API Gateway, Lambda processes and stores in S3/DynamoDB.

**Batch path:** Daily SFTP or Connex export lands in S3. Lambda reconciliation job runs against it to catch anything webhooks missed and feed the reporting pipeline.

**Auth path:** User hits our site, authenticates through Cognito, then we initiate Thanx OAuth handshake server-side to get a Thanx access token for loyalty operations.

---

## Bottom Line

The platform covers what we need. Data export and webhook support directly address the pipeline concern — we can get data into S3 either through free SFTP exports or paid Connex, and get real-time events through webhooks with a daily reconciliation as backup. The integration fits our existing AWS/Lambda architecture without requiring us to rearchitect anything.

The open questions above are the things to nail down in the next conversation with Thanx. The biggest one is how their auth layer plays with Cognito — that's where the most integration friction will be.
