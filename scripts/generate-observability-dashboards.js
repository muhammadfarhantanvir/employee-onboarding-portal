const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dashboardRoot = path.join(root, 'observability', 'grafana', 'dashboards');
const customDir = path.join(dashboardRoot, 'custom');
const importedDir = path.join(dashboardRoot, 'imported');

const PROM = { type: 'prometheus', uid: 'prometheus' };
const LOKI = { type: 'loki', uid: 'loki' };
const JAEGER = { type: 'jaeger', uid: 'jaeger' };
const INFLUX = { type: 'influxdb', uid: 'influxdb' };

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function baseDashboard({ uid, title, tags, panels, templating = [] }) {
  return {
    annotations: {
      list: [
        {
          builtIn: 1,
          datasource: { type: 'datasource', uid: 'grafana' },
          enable: true,
          hide: true,
          iconColor: 'rgba(0, 211, 255, 1)',
          name: 'Annotations & Alerts',
          target: {
            limit: 100,
            matchAny: false,
            tags: [],
            type: 'dashboard',
          },
          type: 'dashboard',
        },
      ],
    },
    editable: true,
    fiscalYearStartMonth: 0,
    graphTooltip: 1,
    id: null,
    links: [],
    panels,
    refresh: '10s',
    schemaVersion: 39,
    tags,
    templating: { list: templating },
    time: { from: 'now-6h', to: 'now' },
    timepicker: {},
    timezone: 'browser',
    title,
    uid,
    version: 1,
    weekStart: '',
  };
}

function prometheusTarget(expr, legendFormat = '', refId = 'A', extra = {}) {
  return {
    datasource: PROM,
    editorMode: 'code',
    expr,
    legendFormat,
    range: true,
    refId,
    ...extra,
  };
}

function lokiTarget(expr, refId = 'A') {
  return {
    datasource: LOKI,
    expr,
    queryType: 'range',
    refId,
  };
}

function timeseries(id, title, gridPos, targets, unit = 'short') {
  return {
    datasource: targets[0]?.datasource ?? PROM,
    fieldConfig: {
      defaults: {
        color: { mode: 'palette-classic' },
        custom: {
          axisBorderShow: false,
          axisCenteredZero: false,
          axisColorMode: 'text',
          axisLabel: '',
          axisPlacement: 'auto',
          barAlignment: 0,
          drawStyle: 'line',
          fillOpacity: 12,
          gradientMode: 'none',
          hideFrom: { legend: false, tooltip: false, viz: false },
          insertNulls: false,
          lineInterpolation: 'linear',
          lineWidth: 2,
          pointSize: 4,
          scaleDistribution: { type: 'linear' },
          showPoints: 'never',
          spanNulls: false,
          stacking: { group: 'A', mode: 'none' },
          thresholdsStyle: { mode: 'off' },
        },
        mappings: [],
        thresholds: {
          mode: 'absolute',
          steps: [
            { color: 'green', value: null },
            { color: 'red', value: 80 },
          ],
        },
        unit,
      },
      overrides: [],
    },
    gridPos,
    id,
    options: {
      legend: {
        calcs: ['lastNotNull'],
        displayMode: 'table',
        placement: 'bottom',
        showLegend: true,
      },
      tooltip: {
        mode: 'multi',
        sort: 'none',
      },
    },
    targets,
    title,
    type: 'timeseries',
  };
}

function stat(id, title, gridPos, expr, unit = 'short', decimals = 2) {
  return {
    datasource: PROM,
    fieldConfig: {
      defaults: {
        color: { mode: 'thresholds' },
        decimals,
        mappings: [],
        thresholds: {
          mode: 'absolute',
          steps: [
            { color: 'green', value: null },
            { color: 'orange', value: 70 },
            { color: 'red', value: 90 },
          ],
        },
        unit,
      },
      overrides: [],
    },
    gridPos,
    id,
    options: {
      colorMode: 'value',
      graphMode: 'area',
      justifyMode: 'auto',
      orientation: 'auto',
      reduceOptions: {
        calcs: ['lastNotNull'],
        fields: '',
        values: false,
      },
      textMode: 'auto',
      wideLayout: true,
    },
    targets: [
      prometheusTarget(expr, '', 'A', {
        instant: true,
        range: false,
      }),
    ],
    title,
    type: 'stat',
  };
}

function gauge(id, title, gridPos, expr, unit = 'short', max = 100) {
  return {
    ...stat(id, title, gridPos, expr, unit, 1),
    fieldConfig: {
      defaults: {
        color: { mode: 'thresholds' },
        max,
        min: 0,
        thresholds: {
          mode: 'absolute',
          steps: [
            { color: 'green', value: null },
            { color: 'orange', value: max * 0.75 },
            { color: 'red', value: max * 0.9 },
          ],
        },
        unit,
      },
      overrides: [],
    },
    options: {
      orientation: 'auto',
      reduceOptions: {
        calcs: ['lastNotNull'],
        fields: '',
        values: false,
      },
      showThresholdLabels: false,
      showThresholdMarkers: true,
    },
    type: 'gauge',
  };
}

function table(id, title, gridPos, target, datasource = PROM) {
  return {
    datasource,
    fieldConfig: {
      defaults: {
        color: { mode: 'thresholds' },
        custom: {
          align: 'auto',
          cellOptions: { type: 'auto' },
          inspect: false,
        },
        mappings: [],
        thresholds: {
          mode: 'absolute',
          steps: [
            { color: 'green', value: null },
            { color: 'red', value: 80 },
          ],
        },
      },
      overrides: [],
    },
    gridPos,
    id,
    options: {
      cellHeight: 'sm',
      footer: {
        countRows: false,
        fields: '',
        reducer: ['sum'],
        show: false,
      },
      showHeader: true,
    },
    targets: [target],
    title,
    transformations: [],
    type: 'table',
  };
}

function logsPanel(id, title, gridPos, expr) {
  return {
    datasource: LOKI,
    gridPos,
    id,
    options: {
      dedupStrategy: 'none',
      enableLogDetails: true,
      prettifyLogMessage: true,
      showCommonLabels: false,
      showLabels: false,
      showTime: true,
      sortOrder: 'Descending',
      wrapLogMessage: false,
    },
    targets: [lokiTarget(expr)],
    title,
    type: 'logs',
  };
}

function tracesPanel(id, title, gridPos, target) {
  return {
    datasource: JAEGER,
    gridPos,
    id,
    options: {},
    targets: [
      {
        datasource: JAEGER,
        limit: 20,
        queryType: 'search',
        refId: 'A',
        service: 'employee-onboarding-api',
        ...target,
      },
    ],
    title,
    type: 'traces',
  };
}

function textbox(name, label, query = '.*') {
  return {
    current: { selected: false, text: query, value: query },
    hide: 0,
    label,
    name,
    options: [{ selected: true, text: query, value: query }],
    query,
    skipUrlSync: false,
    type: 'textbox',
  };
}

function makeApiDashboard() {
  const panels = [
    stat(1, 'Total RPS', { h: 4, w: 6, x: 0, y: 0 }, 'sum(rate(http_request_duration_seconds_count{route!="/api/metrics"}[$__rate_interval]))', 'reqps'),
    stat(2, '5xx Error Rate', { h: 4, w: 6, x: 6, y: 0 }, '100 * sum(rate(http_request_duration_seconds_count{status_code=~"5..",route!="/api/metrics"}[$__rate_interval])) / clamp_min(sum(rate(http_request_duration_seconds_count{route!="/api/metrics"}[$__rate_interval])), 1)', 'percent'),
    stat(3, 'Global P95 Latency', { h: 4, w: 6, x: 12, y: 0 }, 'histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{route!="/api/metrics"}[$__rate_interval])))', 's'),
    gauge(4, 'Active Connections', { h: 4, w: 6, x: 18, y: 0 }, 'nodejs_active_connections', 'short', 100),
    timeseries(5, 'Request Rate by Endpoint', { h: 8, w: 12, x: 0, y: 4 }, [
      prometheusTarget('sum by (method, route) (rate(http_request_duration_seconds_count{route!="/api/metrics"}[$__rate_interval]))', '{{method}} {{route}}'),
    ], 'reqps'),
    timeseries(6, 'HTTP Status Code Breakdown', { h: 8, w: 12, x: 12, y: 4 }, [
      prometheusTarget('sum by (status_class, status_code) (rate(http_request_duration_seconds_count{route!="/api/metrics"}[$__rate_interval]))', '{{status_class}} {{status_code}}'),
    ], 'reqps'),
    timeseries(7, 'p50 / p95 / p99 Response Time per Route', { h: 9, w: 24, x: 0, y: 12 }, [
      prometheusTarget('histogram_quantile(0.50, sum by (le, method, route) (rate(http_request_duration_seconds_bucket{route!="/api/metrics"}[$__rate_interval])))', 'p50 {{method}} {{route}}', 'A'),
      prometheusTarget('histogram_quantile(0.95, sum by (le, method, route) (rate(http_request_duration_seconds_bucket{route!="/api/metrics"}[$__rate_interval])))', 'p95 {{method}} {{route}}', 'B'),
      prometheusTarget('histogram_quantile(0.99, sum by (le, method, route) (rate(http_request_duration_seconds_bucket{route!="/api/metrics"}[$__rate_interval])))', 'p99 {{method}} {{route}}', 'C'),
    ], 's'),
    table(8, 'Slowest Endpoints (Top 10 by p95)', { h: 8, w: 12, x: 0, y: 21 }, prometheusTarget('topk(10, histogram_quantile(0.95, sum by (le, method, route) (rate(http_request_duration_seconds_bucket{route!="/api/metrics"}[5m]))))', '{{method}} {{route}}', 'A', { format: 'table', instant: true, range: false })),
    timeseries(9, 'Error Rate % by Route', { h: 8, w: 12, x: 12, y: 21 }, [
      prometheusTarget('100 * sum by (method, route) (rate(http_request_duration_seconds_count{status_code=~"4..|5..",route!="/api/metrics"}[$__rate_interval])) / clamp_min(sum by (method, route) (rate(http_request_duration_seconds_count{route!="/api/metrics"}[$__rate_interval])), 1)', '{{method}} {{route}}'),
    ], 'percent'),
    gauge(10, 'Active Requests', { h: 5, w: 8, x: 0, y: 29 }, 'nodejs_active_requests', 'short', 50),
    timeseries(11, 'Latency Bucket Heatmap Source', { h: 5, w: 16, x: 8, y: 29 }, [
      prometheusTarget('sum by (le) (rate(http_request_duration_seconds_bucket{route!="/api/metrics"}[$__rate_interval]))', '{{le}}'),
    ], 'ops'),
  ];

  return baseDashboard({
    uid: 'api-performance',
    title: 'API Performance',
    tags: ['employee-onboarding', 'api', 'prometheus'],
    panels,
  });
}

function makeTraceDashboard() {
  const spanHistogram = '{__name__=~"traces_spanmetrics_(duration|latency)_bucket"}';
  const spanCalls = '{__name__=~"traces_spanmetrics_calls(_total)?"}';

  const dashboard = baseDashboard({
    uid: 'distributed-trace-explorer',
    title: 'Distributed Trace Explorer',
    tags: ['employee-onboarding', 'traces', 'jaeger'],
    panels: [
      tracesPanel(1, 'Full Trace Waterfall per Request', { h: 9, w: 24, x: 0, y: 0 }, {}),
      tracesPanel(2, 'Failed Traces', { h: 8, w: 12, x: 0, y: 9 }, { tags: { error: 'true' } }),
      timeseries(3, 'P95 Trace Duration by Service', { h: 8, w: 12, x: 12, y: 9 }, [
        prometheusTarget(`histogram_quantile(0.95, sum by (le, service_name) (rate(${spanHistogram}[$__rate_interval])))`, '{{service_name}}'),
      ], 's'),
      timeseries(4, 'Span Breakdown: NestJS -> Prisma -> Supabase', { h: 8, w: 12, x: 0, y: 17 }, [
        prometheusTarget(`sum by (service_name, span_name) (rate(${spanCalls}[$__rate_interval]))`, '{{service_name}} {{span_name}}'),
      ], 'ops'),
      timeseries(5, 'Failed Spans', { h: 8, w: 12, x: 12, y: 17 }, [
        prometheusTarget(`sum by (service_name, span_name) (rate({__name__=~"traces_spanmetrics_calls(_total)?", status_code=~"Error|STATUS_CODE_ERROR"}[$__rate_interval]))`, '{{service_name}} {{span_name}}'),
      ], 'ops'),
      timeseries(6, 'DB Query Duration by Prisma Operation', { h: 8, w: 12, x: 0, y: 25 }, [
        prometheusTarget(`histogram_quantile(0.95, sum by (le, db_operation) (rate({__name__=~"traces_spanmetrics_(duration|latency)_bucket", db_system=~"postgres|postgresql"}[$__rate_interval])))`, '{{db_operation}}'),
      ], 's'),
      timeseries(7, 'External Call Latency: Supabase Auth / Storage', { h: 8, w: 12, x: 12, y: 25 }, [
        prometheusTarget(`histogram_quantile(0.95, sum by (le, peer_service) (rate({__name__=~"traces_spanmetrics_(duration|latency)_bucket", peer_service=~"supabase.*|Supabase.*"}[$__rate_interval])))`, '{{peer_service}}'),
      ], 's'),
    ],
  });

  dashboard.links = [
    {
      icon: 'external link',
      targetBlank: true,
      title: 'Open Jaeger UI',
      type: 'link',
      url: 'http://localhost:16686',
    },
  ];

  return dashboard;
}

function makeLogsDashboard() {
  return baseDashboard({
    uid: 'log-explorer-error-tracking',
    title: 'Log Explorer & Error Tracking',
    tags: ['employee-onboarding', 'loki', 'logs'],
    templating: [
      textbox('userId', 'userId'),
      textbox('companyId', 'companyId'),
      textbox('traceId', 'traceId'),
    ],
    panels: [
      timeseries(1, 'Log Volume by Level', { h: 8, w: 24, x: 0, y: 0 }, [
        {
          datasource: LOKI,
          expr: 'sum by (level) (count_over_time({job="nestjs"} | json [$__interval]))',
          queryType: 'range',
          refId: 'A',
        },
      ], 'logs'),
      logsPanel(2, 'Error Log Stream', { h: 9, w: 24, x: 0, y: 8 }, '{job="nestjs", level=~"error|fatal"} | json'),
      logsPanel(3, 'Search by userId, companyId, traceId', { h: 9, w: 24, x: 0, y: 17 }, '{job="nestjs"} | json | userId=~"$userId" | companyId=~"$companyId" | traceId=~"$traceId"'),
      logsPanel(4, '4xx Error Log Table with Request Details', { h: 9, w: 12, x: 0, y: 26 }, '{job="nestjs"} | json | statusCode >= 400 and statusCode < 500'),
      logsPanel(5, '5xx Error Log Table with Stack Trace', { h: 9, w: 12, x: 12, y: 26 }, '{job="nestjs"} | json | statusCode >= 500'),
      logsPanel(6, 'Slow Request Log (> 1s Response Time)', { h: 9, w: 24, x: 0, y: 35 }, '{job="nestjs"} | json | durationMs > 1000'),
    ],
  });
}

function makeBusinessDashboard() {
  return baseDashboard({
    uid: 'business-metrics',
    title: 'Business Metrics',
    tags: ['employee-onboarding', 'business', 'prometheus'],
    panels: [
      stat(1, 'Active Hires Being Onboarded', { h: 4, w: 6, x: 0, y: 0 }, 'sum(onboarding_active_hires)', 'short', 0),
      stat(2, 'Tasks Completed Today', { h: 4, w: 6, x: 6, y: 0 }, 'sum(increase(onboarding_tasks_completed_total[1d]))', 'short', 0),
      stat(3, 'Documents Uploaded Today', { h: 4, w: 6, x: 12, y: 0 }, 'sum(increase(onboarding_documents_uploaded_total[1d]))', 'short', 0),
      stat(4, 'Hire Invites Sent Today', { h: 4, w: 6, x: 18, y: 0 }, 'sum(increase(onboarding_hire_invites_sent_total[1d]))', 'short', 0),
      stat(5, 'BullMQ Email Jobs Sent Today', { h: 4, w: 6, x: 0, y: 4 }, 'sum(increase(onboarding_bullmq_email_jobs_sent_total[1d]))', 'short', 0),
      stat(6, 'Failed Document Virus Scans', { h: 4, w: 6, x: 6, y: 4 }, 'sum(increase(onboarding_failed_document_virus_scans_total[1d]))', 'short', 0),
      gauge(7, 'Onboarding Completion Rate (Last 7 Days)', { h: 4, w: 12, x: 12, y: 4 }, 'avg(avg_over_time(onboarding_completion_rate_percent[7d]))', 'percent', 100),
      timeseries(8, 'Active Hires by Company', { h: 8, w: 12, x: 0, y: 8 }, [
        prometheusTarget('onboarding_active_hires', '{{company_id}}'),
      ], 'short'),
      timeseries(9, 'Tasks Completed per Minute', { h: 8, w: 12, x: 12, y: 8 }, [
        prometheusTarget('sum by (company_id) (increase(onboarding_tasks_completed_total[1m]))', '{{company_id}}'),
      ], 'short'),
      timeseries(10, 'Document Uploads by Category', { h: 8, w: 12, x: 0, y: 16 }, [
        prometheusTarget('sum by (company_id, category) (increase(onboarding_documents_uploaded_total[$__rate_interval]))', '{{company_id}} {{category}}'),
      ], 'short'),
      timeseries(11, 'Hire Invites and Email Jobs', { h: 8, w: 12, x: 12, y: 16 }, [
        prometheusTarget('sum(increase(onboarding_hire_invites_sent_total[$__rate_interval]))', 'hire invites', 'A'),
        prometheusTarget('sum(increase(onboarding_bullmq_email_jobs_sent_total[$__rate_interval]))', 'email jobs', 'B'),
      ], 'short'),
      table(12, 'Company Completion Rate', { h: 7, w: 24, x: 0, y: 24 }, prometheusTarget('onboarding_completion_rate_percent', '{{company_id}}', 'A', { format: 'table', instant: true, range: false })),
    ],
  });
}

function removePanelsByTitle(dashboard, prefixes) {
  dashboard.panels = (dashboard.panels ?? []).filter((panel) => {
    const title = String(panel.title ?? '');
    return !prefixes.some((prefix) => title.startsWith(prefix));
  });
}

function maxPanelId(dashboard) {
  const panels = dashboard.panels ?? [];
  return panels.reduce((max, panel) => Math.max(max, Number(panel.id) || 0), 0);
}

function patchRedisDashboard(filePath) {
  const dashboard = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  dashboard.id = null;
  dashboard.uid = 'redis-bullmq';
  dashboard.title = 'Redis & BullMQ';
  dashboard.tags = [...new Set([...(dashboard.tags ?? []), 'employee-onboarding', 'redis', 'bullmq'])];
  removePanelsByTitle(dashboard, ['BullMQ:', 'Redis Memory Used vs Max', 'Redis Commands per Second', 'Redis Connected Clients']);

  let id = maxPanelId(dashboard) + 1;
  dashboard.panels.push(
    timeseries(id++, 'Redis Memory Used vs Max', { h: 7, w: 8, x: 0, y: 60 }, [
      prometheusTarget('redis_memory_used_bytes{job="redis-exporter"}', 'used'),
      prometheusTarget('redis_memory_max_bytes{job="redis-exporter"}', 'max'),
    ], 'bytes'),
    timeseries(id++, 'Redis Commands per Second', { h: 7, w: 8, x: 8, y: 60 }, [
      prometheusTarget('sum(rate(redis_commands_processed_total{job="redis-exporter"}[$__rate_interval]))', 'commands/sec'),
    ], 'ops'),
    gauge(id++, 'Redis Connected Clients', { h: 7, w: 8, x: 16, y: 60 }, 'sum(redis_connected_clients{job="redis-exporter"})', 'short', 100),
    timeseries(id++, 'BullMQ: Jobs Completed per Minute', { h: 7, w: 8, x: 0, y: 67 }, [
      prometheusTarget('sum by (queue, job_name) (increase(bullmq_jobs_completed_total[1m]))', '{{queue}} {{job_name}}'),
    ], 'short'),
    timeseries(id++, 'BullMQ: Jobs Failed per Minute', { h: 7, w: 8, x: 8, y: 67 }, [
      prometheusTarget('sum by (queue, job_name) (increase(bullmq_jobs_failed_total[1m]))', '{{queue}} {{job_name}}'),
    ], 'short'),
    gauge(id++, 'BullMQ: Queue Depth (Waiting Jobs)', { h: 7, w: 8, x: 16, y: 67 }, 'sum by (queue) (bullmq_queue_waiting_jobs)', 'short', 100),
    timeseries(id++, 'BullMQ: Job Processing Duration p95', { h: 7, w: 24, x: 0, y: 74 }, [
      prometheusTarget('histogram_quantile(0.95, sum by (le, queue, job_name) (rate(bullmq_job_processing_duration_seconds_bucket[$__rate_interval])))', '{{queue}} {{job_name}}'),
    ], 's'),
  );

  writeJson(filePath, dashboard);
}

function patchPostgresDashboard(filePath) {
  const dashboard = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  dashboard.id = null;
  dashboard.uid = 'postgres-supabase';
  dashboard.title = 'PostgreSQL / Supabase';
  dashboard.tags = [...new Set([...(dashboard.tags ?? []), 'employee-onboarding', 'postgres', 'supabase'])];
  removePanelsByTitle(dashboard, ['Supabase:', 'Postgres:']);

  let id = maxPanelId(dashboard) + 1;
  dashboard.panels.push(
    timeseries(id++, 'Postgres: Active DB Connections vs Max', { h: 7, w: 12, x: 0, y: 80 }, [
      prometheusTarget('sum(pg_stat_activity_count)', 'active'),
      prometheusTarget('max(pg_settings_max_connections)', 'max'),
    ], 'short'),
    timeseries(id++, 'Postgres: Transactions per Second (TPS)', { h: 7, w: 12, x: 12, y: 80 }, [
      prometheusTarget('sum(rate(pg_stat_database_xact_commit[$__rate_interval]) + rate(pg_stat_database_xact_rollback[$__rate_interval]))', 'tps'),
    ], 'ops'),
    table(id++, 'Postgres: Slow Queries > 100ms', { h: 7, w: 24, x: 0, y: 87 }, prometheusTarget('topk(10, pg_stat_statements_mean_time_seconds > 0.1)', '{{datname}} {{queryid}}', 'A', { format: 'table', instant: true, range: false })),
    gauge(id++, 'Postgres: Cache Hit Ratio', { h: 7, w: 8, x: 0, y: 94 }, '100 * sum(rate(pg_stat_database_blks_hit[$__rate_interval])) / clamp_min(sum(rate(pg_stat_database_blks_hit[$__rate_interval]) + rate(pg_stat_database_blks_read[$__rate_interval])), 1)', 'percent', 100),
    timeseries(id++, 'Postgres: Table Row Counts Over Time', { h: 7, w: 8, x: 8, y: 94 }, [
      prometheusTarget('pg_stat_user_tables_n_live_tup', '{{relname}}'),
    ], 'short'),
    timeseries(id++, 'Postgres: Index Scan vs Sequential Scan Ratio', { h: 7, w: 8, x: 16, y: 94 }, [
      prometheusTarget('sum by (relname) (rate(pg_stat_user_tables_idx_scan[$__rate_interval])) / clamp_min(sum by (relname) (rate(pg_stat_user_tables_seq_scan[$__rate_interval])), 1)', '{{relname}}'),
    ], 'short'),
    timeseries(id++, 'Postgres: Dead Tuples', { h: 7, w: 24, x: 0, y: 101 }, [
      prometheusTarget('pg_stat_user_tables_n_dead_tup', '{{relname}}'),
    ], 'short'),
  );

  writeJson(filePath, dashboard);
}

function influxRawTarget(query, alias, refId) {
  return {
    alias,
    datasource: INFLUX,
    groupBy: [
      { params: ['$__interval'], type: 'time' },
      { params: ['null'], type: 'fill' },
    ],
    measurement: '',
    orderByTime: 'ASC',
    policy: 'default',
    query,
    rawQuery: true,
    refId,
    resultFormat: 'time_series',
    select: [[{ params: ['value'], type: 'field' }]],
    tags: [],
  };
}

function oldGraphPanel(id, title, targets) {
  return {
    aliasColors: {},
    bars: false,
    dashLength: 10,
    dashes: false,
    datasource: 'InfluxDB',
    fill: 1,
    id,
    legend: {
      alignAsTable: true,
      avg: false,
      current: true,
      max: true,
      min: false,
      show: true,
      total: false,
      values: true,
    },
    lines: true,
    linewidth: 1,
    nullPointMode: 'null',
    percentage: false,
    pointradius: 5,
    points: false,
    renderer: 'flot',
    seriesOverrides: [],
    spaceLength: 10,
    stack: false,
    steppedLine: false,
    targets,
    thresholds: [],
    timeFrom: null,
    timeShift: null,
    title,
    tooltip: {
      shared: true,
      sort: 0,
      value_type: 'individual',
    },
    type: 'graph',
    xaxis: {
      buckets: null,
      mode: 'time',
      name: null,
      show: true,
      values: [],
    },
    yaxes: [
      {
        format: 'short',
        label: null,
        logBase: 1,
        max: null,
        min: null,
        show: true,
      },
      {
        format: 'short',
        label: null,
        logBase: 1,
        max: null,
        min: null,
        show: true,
      },
    ],
  };
}

function patchK6Dashboard(filePath) {
  const dashboard = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  dashboard.id = null;
  dashboard.uid = 'k6-load-testing';
  dashboard.title = 'k6 Load Test Dashboard';
  dashboard.tags = [...new Set([...(dashboard.tags ?? []), 'employee-onboarding', 'k6', 'load-test'])];
  dashboard.rows = (dashboard.rows ?? []).filter((row) => row.title !== 'Scenario & Throughput Details');

  dashboard.rows.push({
    collapse: false,
    height: '250px',
    panels: [
      oldGraphPanel(9001, 'Data Sent / Received MB', [
        influxRawTarget('SELECT mean("value") / 1048576 FROM "data_sent" WHERE $timeFilter GROUP BY time($__interval) fill(null)', 'sent MB', 'A'),
        influxRawTarget('SELECT mean("value") / 1048576 FROM "data_received" WHERE $timeFilter GROUP BY time($__interval) fill(null)', 'received MB', 'B'),
      ]),
      oldGraphPanel(9002, 'Scenario Phase Markers', [
        influxRawTarget('SELECT count("value") FROM "scenario_phase" WHERE $timeFilter GROUP BY time($__interval), "scenario", "phase" fill(0)', 'phase markers', 'A'),
      ]),
    ],
    repeat: null,
    repeatIteration: null,
    repeatRowId: null,
    showTitle: true,
    title: 'Scenario & Throughput Details',
    titleSize: 'h6',
  });

  writeJson(filePath, dashboard);
}

function normalizeImportedDashboards() {
  const replacements = [
    ['${ds_prometheus}', 'prometheus'],
    ['${DS_PROMETHEUS}', 'Prometheus'],
    ['${DS_K6}', 'InfluxDB'],
  ];

  for (const file of fs.readdirSync(importedDir).filter((name) => name.endsWith('.json'))) {
    const filePath = path.join(importedDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [from, to] of replacements) {
      content = content.split(from).join(to);
    }
    fs.writeFileSync(filePath, content);
  }

  patchRedisDashboard(path.join(importedDir, 'redis-exporter-11835.json'));
  patchPostgresDashboard(path.join(importedDir, 'postgresql-database-9628.json'));
  patchK6Dashboard(path.join(importedDir, 'k6-load-testing-2587.json'));
}

function main() {
  ensureDir(customDir);
  normalizeImportedDashboards();
  writeJson(path.join(customDir, 'api-performance.json'), makeApiDashboard());
  writeJson(path.join(customDir, 'distributed-trace-explorer.json'), makeTraceDashboard());
  writeJson(path.join(customDir, 'log-explorer-error-tracking.json'), makeLogsDashboard());
  writeJson(path.join(customDir, 'business-metrics.json'), makeBusinessDashboard());
}

main();
