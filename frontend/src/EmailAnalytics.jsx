import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const activityTrends = {
  daily: [
    { label: "Mon", inbox: 34, sent: 19 },
    { label: "Tue", inbox: 41, sent: 22 },
    { label: "Wed", inbox: 37, sent: 18 },
    { label: "Thu", inbox: 49, sent: 25 },
    { label: "Fri", inbox: 44, sent: 28 },
    { label: "Sat", inbox: 22, sent: 12 },
    { label: "Sun", inbox: 18, sent: 9 },
  ],
  weekly: [
    { label: "Week 1", inbox: 124, sent: 88 },
    { label: "Week 2", inbox: 138, sent: 92 },
    { label: "Week 3", inbox: 112, sent: 81 },
    { label: "Week 4", inbox: 156, sent: 109 },
    { label: "Week 5", inbox: 149, sent: 103 },
    { label: "Week 6", inbox: 173, sent: 118 },
    { label: "Week 7", inbox: 158, sent: 111 },
    { label: "Week 8", inbox: 186, sent: 126 },
  ],
  monthly: [
    { label: "Jan", inbox: 408, sent: 280 },
    { label: "Feb", inbox: 372, sent: 255 },
    { label: "Mar", inbox: 445, sent: 308 },
    { label: "Apr", inbox: 421, sent: 294 },
    { label: "May", inbox: 468, sent: 322 },
    { label: "Jun", inbox: 452, sent: 315 },
    { label: "Jul", inbox: 496, sent: 341 },
    { label: "Aug", inbox: 481, sent: 330 },
    { label: "Sep", inbox: 522, sent: 359 },
    { label: "Oct", inbox: 508, sent: 348 },
    { label: "Nov", inbox: 546, sent: 376 },
    { label: "Dec", inbox: 530, sent: 365 },
  ],
};

function AnalyticsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const title = label ?? payload[0]?.payload?.label ?? payload[0]?.name;

  return (
    <div className="analytics-tooltip">
      {title && <strong className="analytics-tooltip-title">{title}</strong>}
      {payload.map((item) => (
        <div className="analytics-tooltip-row" key={item.dataKey ?? item.name}>
          <span
            className="analytics-tooltip-swatch"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.name ?? item.dataKey}</span>
          <strong>{Number(item.value).toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}

function AnalyticsDonut({ data, label, total, colors, caption = "emails" }) {
  return (
    <div className="analytics-donut-layout">
      <div className="analytics-donut" role="img" aria-label={label}>
        {total > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={62}
                paddingAngle={4}
                stroke="none"
                isAnimationActive
                animationDuration={650}
              >
                {data.map((item, index) => (
                  <Cell key={item.name} fill={colors[index]} />
                ))}
              </Pie>
              <Tooltip content={<AnalyticsTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="analytics-donut-empty" aria-hidden="true" />
        )}
        <div className="analytics-donut-center" aria-hidden="true">
          <strong>{total.toLocaleString()}</strong>
          <span>{total ? caption : "No data"}</span>
        </div>
      </div>
      <div className="analytics-legend-list">
        {data.map((item, index) => (
          <div className="analytics-legend-item" key={item.name}>
            <span>
              <i
                className={`analytics-dot ${
                  item.name === "Read" ? "read" : item.name === "Sent" ? "sent" : "inbox"
                }`}
              />
              {item.name}
            </span>
            <strong>{item.value.toLocaleString()}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EmailAnalytics({
  emails,
  unreadCount,
  priorityBreakdown,
  gmailConnected,
}) {
  const [trendRange, setTrendRange] = useState("daily");
  const activityData = activityTrends[trendRange];
  const activityTotals = activityData.reduce(
    (totals, point) => ({
      inbox: totals.inbox + point.inbox,
      sent: totals.sent + point.sent,
    }),
    { inbox: 0, sent: 0 },
  );
  const readStatusData = [
    { name: "Read", value: emails.length - unreadCount },
    { name: "Unread", value: unreadCount },
  ];
  const inboxSentData = [
    { name: "Inbox", value: activityTotals.inbox },
    { name: "Sent", value: activityTotals.sent },
  ];
  const categoryBreakdown = useMemo(() => {
    const categoryCounts = emails.reduce((counts, email) => {
      const category = email.category || "Other";
      counts[category] = (counts[category] ?? 0) + 1;
      return counts;
    }, {});
    return Object.entries(categoryCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [emails]);
  const trendPeriods = [
    ["daily", "Daily"],
    ["weekly", "Weekly"],
    ["monthly", "Monthly"],
  ];
  const totalReadStatus = readStatusData.reduce((total, item) => total + item.value, 0);

  return (
    <section className="email-analytics" aria-label="Email analytics">
      <div className="email-analytics-heading">
        <div className="email-analytics-title">
          <span className="email-section-kicker">INSIGHTS</span>
          <h2>Email analytics</h2>
        </div>
        <div className="email-analytics-controls">
          <span className={`analytics-sample-label${gmailConnected ? " connected" : ""}`}>
            {gmailConnected ? "Gmail connected" : "Demo inbox"}
          </span>
          <div className="analytics-range" role="group" aria-label="Activity trend period">
            {trendPeriods.map(([range, label]) => (
              <button
                type="button"
                className={trendRange === range ? "selected" : ""}
                aria-pressed={trendRange === range}
                key={range}
                onClick={() => setTrendRange(range)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="email-analytics-grid">
        <article className="analytics-card analytics-card-wide">
          <div className="analytics-card-heading">
            <div>
              <h3>Email activity</h3>
              <p>Illustrative activity trend</p>
            </div>
            <div className="analytics-legend" aria-hidden="true">
              <span><i className="analytics-dot inbox" />Received</span>
              <span><i className="analytics-dot sent" />Sent</span>
              <span className="analytics-trend-note">Sample</span>
            </div>
          </div>
          <div
            className="analytics-chart"
            role="img"
            aria-label={`Illustrative received and sent email activity, ${trendRange}`}
          >
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart
                data={activityData}
                margin={{ top: 12, right: 18, bottom: 4, left: 8 }}
              >
                <defs>
                  <linearGradient id="email-inbox-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="email-sent-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--analytics-sent)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--analytics-sent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--soft-line)"
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  interval={trendRange === "monthly" ? "preserveStartEnd" : 0}
                  tickMargin={12}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  width={42}
                  tickCount={5}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<AnalyticsTooltip />}
                  cursor={{ stroke: "var(--line)", strokeDasharray: "3 4" }}
                />
                <Area
                  type="monotone"
                  dataKey="inbox"
                  name="Received"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  fill="url(#email-inbox-gradient)"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive
                  animationDuration={650}
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  name="Sent"
                  stroke="var(--analytics-sent)"
                  strokeWidth={2.5}
                  fill="url(#email-sent-gradient)"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive
                  animationDuration={650}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="analytics-card">
          <div className="analytics-card-heading">
            <div>
              <h3>Read status</h3>
              <p>Inbox engagement</p>
            </div>
          </div>
          <AnalyticsDonut
            data={readStatusData}
            label={`${emails.length - unreadCount} read and ${unreadCount} unread emails`}
            total={totalReadStatus}
            colors={["var(--analytics-read)", "var(--accent)"]}
          />
        </article>

        <article className="analytics-card">
          <div className="analytics-card-heading">
            <div>
              <h3>Inbox vs sent</h3>
              <p>Illustrative {trendRange} volume</p>
            </div>
          </div>
          <AnalyticsDonut
            data={inboxSentData}
            label={`Illustrative data: ${activityTotals.inbox} inbox and ${activityTotals.sent} sent emails`}
            total={activityTotals.inbox + activityTotals.sent}
            caption="total"
            colors={["var(--accent)", "var(--analytics-sent)"]}
          />
        </article>

        <article className="analytics-card">
          <div className="analytics-card-heading">
            <div>
              <h3>Priority emails</h3>
              <p>Current inbox by priority</p>
            </div>
          </div>
          <div
            className="analytics-chart analytics-compact-chart"
            role="img"
            aria-label={`High priority ${priorityBreakdown[0].count}, medium priority ${priorityBreakdown[1].count}, low priority ${priorityBreakdown[2].count}`}
          >
            <ResponsiveContainer width="100%" height={190}>
              <BarChart
                data={priorityBreakdown}
                layout="vertical"
                margin={{ top: 6, right: 28, bottom: 8, left: 0 }}
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="var(--soft-line)"
                  strokeDasharray="3 5"
                />
                <XAxis
                  type="number"
                  domain={[0, (max) => (max > 0 ? max * 1.25 : 1)]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  tickMargin={8}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  width={58}
                />
                <Tooltip
                  content={<AnalyticsTooltip />}
                  trigger="hover"
                  shared={false}
                  cursor={{ fill: "var(--analytics-hover)" }}
                />
                <Bar
                  dataKey="count"
                  name="Emails"
                  radius={[0, 6, 6, 0]}
                  barSize={13}
                  isAnimationActive={false}
                >
                  {priorityBreakdown.map((item) => (
                    <Cell
                      key={item.label}
                      fill={
                        item.label === "High"
                          ? "var(--accent)"
                          : item.label === "Medium"
                            ? "var(--analytics-priority-medium)"
                            : "var(--analytics-muted)"
                      }
                    />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    fill="var(--muted)"
                    fontSize={11}
                    formatter={(value) => Number(value).toLocaleString()}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="analytics-card">
          <div className="analytics-card-heading">
            <div>
              <h3>Categories</h3>
              <p>Messages by category</p>
            </div>
          </div>
          <div
            className="analytics-chart analytics-compact-chart"
            role="img"
            aria-label={`Email categories: ${categoryBreakdown.map((item) => `${item.label} ${item.count}`).join(", ") || "no messages"}`}
          >
            {categoryBreakdown.length ? (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart
                  data={categoryBreakdown}
                  layout="vertical"
                  margin={{ top: 6, right: 28, bottom: 8, left: 0 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke="var(--soft-line)"
                    strokeDasharray="3 5"
                  />
                  <XAxis
                    type="number"
                    domain={[0, (max) => (max > 0 ? max * 1.25 : 1)]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted)", fontSize: 10 }}
                    tickMargin={8}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    width={92}
                    tickFormatter={(value) => {
                      const label = String(value);
                      return label.length > 13 ? `${label.slice(0, 12)}…` : label;
                    }}
                  />
                  <Tooltip
                    content={<AnalyticsTooltip />}
                    trigger="hover"
                    shared={false}
                    cursor={{ fill: "var(--analytics-hover)" }}
                  />
                  <Bar
                    dataKey="count"
                    name="Emails"
                    fill="var(--analytics-category)"
                    radius={[0, 6, 6, 0]}
                    barSize={11}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="count"
                      position="right"
                      fill="var(--muted)"
                      fontSize={11}
                      formatter={(value) => Number(value).toLocaleString()}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="analytics-empty">No messages to chart</div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
