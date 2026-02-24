# Thanx Technical Overview - Review Notes

## What Looks Good

- **PCI DSS Level 1 and SOC 2 Type 2 compliance.** This is the standard we'd expect from anyone handling customer payment and loyalty data.
- **Documented public API** at docs.thanx.com. We already talk to external APIs through our Lambda pipeline, so having a well-documented API is a good starting point for integration.
- **AWS-native infrastructure.** They run on AWS (US-East-1), and we're on AWS (US-East-2). They also support PrivateLink for low-latency, secure connectivity between AWS accounts.
- **Terraform-managed infrastructure and Datadog observability.** This signals operational maturity and good engineering practices.
- **gRPC for internal service communication.** This is performant and type-safe. It wouldn't affect us directly since we'd be using their public-facing REST API.

## Concerns and Questions

### 1. Single Region Deployment (US-East-1 Only)

They deploy everything in a single AWS region. There's no mention of multi-region failover or disaster recovery. US-East-1 has had notable outages in the past, and if it goes down, their entire platform goes with it. We should ask what their Recovery Time Objective (RTO) and Recovery Point Objective (RPO) look like, and whether they have a disaster recovery plan for regional outages.

### 2. Data Isolation in a Multi-Tenant Setup

They describe the platform as "multi-tenant" but don't explain how tenant data is actually isolated. Is it shared databases with tenant ID filtering? Separate schemas? Separate databases? This matters because our customer data would be sitting alongside other brands' data. We should ask for a data isolation architecture diagram or at least a clear explanation of how they separate tenant data at the database level.

### 3. The Integration Model is Vague for Our Use Case

Our current loyalty data flow looks like this:

```
External API -> Lambda (Raw Data Extraction) -> S3 -> Report Lambdas -> S3 -> Client UI
```

The Thanx doc talks about POS and credit card network integrations but doesn't get specific about how a brand's internal team would actually pull data. They mention a public API and "embedded merchant insights" through Looker, but it's unclear whether we'd still run our own Lambdas against their API, whether they'd push data to us, and whether our existing reporting pages (red flags, scan percentages, rewards data) would still work or need to be rebuilt around their data format. Our entire CSV-based pipeline would likely need significant rework. We need to understand exactly what the data export model looks like before we can evaluate effort.

### 4. No Mention of Webhooks or Real-Time Event Streaming

Our current system processes loyalty data in daily batches via AWS Step Functions. Thanx mentions Sidekiq queues for "real-time transactional workloads" internally, but the doc doesn't mention webhooks for loyalty events (sign-ups, redemptions, scans), event streaming (Kafka, SNS, EventBridge), or any data export APIs. We should ask whether they support webhooks or event-based notifications and how we'd get near-real-time loyalty transaction data if needed.

### 5. Snowflake/Looker Analytics Stack Could Create Overlap or Lock-In

They use Snowflake, dbt, and Looker for analytics. We currently handle analytics client-side with our own CSV processing and custom reporting. If we adopt Thanx, we need to understand whether we'd be expected to use their Looker dashboards or if we can pull raw data ourselves. We've built custom reporting (red flag detection, discount-without-rewards-ID tracking, scan summaries) and we need to know if those translate into their system. Direct Snowflake access for our team could be valuable, but it also adds a dependency. We should ask whether raw data exports or direct Snowflake access are options.

### 6. Small Team with No Dedicated DevOps or Security Function

They have roughly 30 engineers covering loyalty, ordering, marketing automation, mobile apps, AI, and infrastructure. They frame the lack of a dedicated DevOps team as a positive ("full-stack ownership"), but that's a lot of surface area for a team of that size. There's no dedicated security team mentioned either, just compliance certifications. Their "weekly release cadence" is also relatively slow for a SaaS platform. This isn't necessarily a red flag, but we should understand their support model, incident response SLAs, and how they handle escalations.

### 7. AI Features are Early-Stage

Their SegmentAI tool (natural language to targeting queries) is described as "emerging." The AI capabilities are marketing-facing features, not core infrastructure. Worth knowing about but shouldn't be weighted heavily in the decision.

### 8. Cloudflare as a Single Point of Failure at the Edge

They route all traffic through Cloudflare and block non-Cloudflare traffic at the load balancer. This is good security practice, but it means a Cloudflare outage equals a total Thanx outage. Worth noting as a risk factor.

## Questions We Should Ask

1. **Data access:** How do we get raw transaction-level loyalty data out? API pulls? Webhooks? Scheduled data exports? Direct Snowflake access?
2. **Data isolation:** How is tenant data separated in the multi-tenant model? Can you provide an architecture diagram?
3. **SLAs:** What are your uptime SLAs, API latency targets (p50/p95/p99), and incident response times?
4. **Disaster recovery:** What happens if US-East-1 goes down? What's the failover plan?
5. **Migration path:** What does onboarding look like for a brand with an existing loyalty data pipeline? What's the expected transition timeline and effort?
6. **Data format compatibility:** Can we get data in formats compatible with our current CSV-based pipeline, or would we need to rebuild our reporting tools?

## Summary

The platform looks technically solid and well-operated as a loyalty and marketing SaaS product. The main concerns are not red flags but rather gaps in this document around data portability, integration specifics, and how everything would mesh with our existing custom reporting pipeline. We've built significant in-house loyalty analytics tooling, and understanding exactly how that survives (or doesn't survive) a Thanx integration is the most important thing to figure out before moving forward.
