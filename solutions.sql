-- Part 2.2 — SQL solutions
-- Read-only queries for the supplied schema; validated with PostgreSQL sample data.

-- 2.2.1 — Filtering and Ordering
-- August boundaries are inclusive; a budget of exactly 5000 is excluded.
SELECT
    campaign_id,
    campaign_name
FROM Campaigns
WHERE start_date BETWEEN '2026-08-01' AND '2026-08-31'
  AND budget > 5000.00
ORDER BY budget DESC;

-- 2.2.2 — Cost Per Click
-- The prompt guarantees at least one August row for each relevant
-- campaign/device combination. No missing combinations need to be generated.
-- Return 0 when total clicks are zero or NULL, or the calculated CPC is NULL.
SELECT
    campaign_id,
    device_type,
    COALESCE(
        SUM(spend) / NULLIF(SUM(clicks), 0),
        0
    ) AS cpc
FROM AdMetrics
WHERE campaign_id IN (
    'CID-ABC111',
    'CID-ABC222',
    'CID-ABC333'
)
  AND report_date BETWEEN '2026-08-01' AND '2026-08-31'
GROUP BY
    campaign_id,
    device_type
ORDER BY
    campaign_id,
    device_type;

-- 2.2.3 — Campaign Performance per Advertiser
-- Assumptions: supplied advertiser IDs exist in Advertisers. Include all their
-- campaigns, regardless of activity or dates. No reporting period is specified,
-- so aggregate metrics across all available dates. Advertisers without campaigns
-- retain NULL campaign fields; missing metric totals are returned as zero.
SELECT
    a.advertiser_id,
    c.campaign_id,
    c.campaign_name,
    COALESCE(SUM(m.impressions), 0) AS total_impressions,
    COALESCE(SUM(m.clicks), 0) AS total_clicks,
    COALESCE(SUM(m.spend), 0) AS total_spend
FROM Advertisers a
LEFT JOIN Campaigns c
    ON a.advertiser_id = c.advertiser_id
LEFT JOIN AdMetrics m
    ON c.campaign_id = m.campaign_id
WHERE a.advertiser_id IN (
    'ADV-111',
    'ADV-222',
    'ADV-333'
)
GROUP BY
    a.advertiser_id,
    c.campaign_id,
    c.campaign_name
ORDER BY
    total_impressions DESC,
    total_spend DESC;
