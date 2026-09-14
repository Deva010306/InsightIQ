// Rich mock data for all unimplemented backend endpoints
// Swap with real API calls as each endpoint is implemented

export const mockKPIs = [
  {
    id: 'revenue',
    label: 'Monthly Revenue',
    value: '₹2.41Cr',
    rawValue: 24100000,
    trend: +8.3,
    trendDir: 'up' as const,
    period: 'vs last month',
    accent: 'var(--color-primary)',
    sparkline: [1.78, 1.96, 1.70, 2.04, 2.21, 2.13, 2.41],
  },
  {
    id: 'arr',
    label: 'Annual Recurring Revenue',
    value: '₹28.99Cr',
    rawValue: 289900000,
    trend: +12.4,
    trendDir: 'up' as const,
    period: 'vs last year',
    accent: 'var(--color-teal)',
    sparkline: [23.8, 24.65, 25.5, 26.35, 26.78, 28.05, 28.99],
  },
  {
    id: 'churn',
    label: 'Churn Rate',
    value: '2.1%',
    rawValue: 2.1,
    trend: -0.4,
    trendDir: 'up' as const, // down churn = good (up arrow, green)
    period: 'vs last month',
    accent: 'var(--color-success)',
    sparkline: [2.8, 2.7, 2.6, 2.5, 2.4, 2.3, 2.1],
  },
  {
    id: 'pipeline',
    label: 'Sales Pipeline',
    value: '₹10.71Cr',
    rawValue: 107100000,
    trend: -5.2,
    trendDir: 'down' as const,
    period: 'vs last month',
    accent: 'var(--color-warning)',
    sparkline: [11.9, 11.73, 11.48, 11.22, 11.05, 11.14, 10.71],
  },
  {
    id: 'nps',
    label: 'Net Promoter Score',
    value: '67',
    rawValue: 67,
    trend: +3,
    trendDir: 'up' as const,
    period: 'vs last quarter',
    accent: 'var(--color-ai)',
    sparkline: [55, 58, 60, 62, 63, 65, 67],
  },
  {
    id: 'cac',
    label: 'Customer Acq. Cost',
    value: '₹1,05,400',
    rawValue: 105400,
    trend: -8.7,
    trendDir: 'up' as const, // lower CAC = better
    period: 'vs last quarter',
    accent: 'var(--color-teal)',
    sparkline: [134300, 127500, 123250, 117300, 113900, 109650, 105400],
  },
]

export const mockInsights = [
  {
    id: '1',
    severity: 'critical' as const,
    title: 'Enterprise churn risk detected in West region',
    summary: '34 enterprise accounts in the West region show elevated churn signals. Combined ARR at risk: ₹3.57Cr. Renewal outreach recommended within 7 days.',
    confidence: 88,
    evidenceCount: 12,
    type: 'churn_risk',
    createdAt: '2 hours ago',
  },
  {
    id: '2',
    severity: 'high' as const,
    title: 'Paid search conversion dropped 21.5% after budget cut',
    summary: 'Conversion rates for Brand and Competitor campaigns fell sharply following a 30% budget reduction on Aug 1st. Revenue impact estimated at ₹15.3L/month.',
    confidence: 82,
    evidenceCount: 7,
    type: 'revenue_impact',
    createdAt: '4 hours ago',
  },
  {
    id: '3',
    severity: 'medium' as const,
    title: 'Support ticket volume up 38% — product gap detected',
    summary: 'Feature X is generating disproportionate support load. Resolution time averaging 4.2 days. Root cause: missing documentation and UX friction in onboarding flow.',
    confidence: 74,
    evidenceCount: 9,
    type: 'operational',
    createdAt: '6 hours ago',
  },
  {
    id: '4',
    severity: 'low' as const,
    title: 'Q3 pipeline target tracking 8% ahead of plan',
    summary: 'Mid-market pipeline is outperforming the Q3 target by ₹93.5L. 3 high-value opportunities expected to close before month-end.',
    confidence: 79,
    evidenceCount: 5,
    type: 'opportunity',
    createdAt: '1 day ago',
  },
]

export const mockAlerts = [
  {
    id: '1',
    severity: 'critical' as const,
    title: 'Revenue forecast at risk — Q3 gap widening',
    desc: 'Current trajectory projects a ₹35.7L shortfall vs Q3 target. Enterprise renewals are primary driver.',
    time: '15 min ago',
    metric: 'Monthly Revenue',
  },
  {
    id: '2',
    severity: 'high' as const,
    title: 'Data sync failure: Salesforce connector',
    desc: 'Salesforce CRM data has not synced in 6 hours. Pipeline and deal stage data may be stale.',
    time: '1 hour ago',
    metric: 'Data Quality',
  },
  {
    id: '3',
    severity: 'medium' as const,
    title: 'Churn model confidence dropped below threshold',
    desc: 'Churn prediction model confidence fell to 71%. Model retraining recommended.',
    time: '3 hours ago',
    metric: 'Churn Rate',
  },
]

export const mockRecommendations = [
  {
    id: '1',
    title: 'Launch enterprise renewal outreach campaign',
    objective: 'Churn Prevention',
    impact: 'High',
    effort: 'Medium',
    risk: 'Low',
    expectedROI: '+₹3.57Cr ARR protected',
    confidence: 88,
    owner: 'Sarah Mitchell',
    dueDate: 'Aug 10, 2026',
    status: 'pending',
    desc: 'Initiate personalized outreach to 34 at-risk enterprise accounts in the West region. Prioritize by ARR value and health score decline velocity.',
    timeToImpact: '7–14 days',
    evidenceCount: 12,
  },
  {
    id: '2',
    title: 'Restore paid search budget for top 2 campaigns',
    objective: 'Revenue Recovery',
    impact: 'High',
    effort: 'Low',
    risk: 'Low',
    expectedROI: '+₹15.3L/month',
    confidence: 82,
    owner: 'James Park',
    dueDate: 'Aug 8, 2026',
    status: 'pending',
    desc: 'Restore spend to Brand and Competitor campaigns that drove highest ROAS before the Aug 1 budget cut. Expected conversion rate recovery within 5–7 days.',
    timeToImpact: '5–7 days',
    evidenceCount: 7,
  },
  {
    id: '3',
    title: 'Update Feature X documentation and onboarding flow',
    objective: 'Operational Efficiency',
    impact: 'Medium',
    effort: 'Low',
    risk: 'Low',
    expectedROI: '-38% support tickets',
    confidence: 74,
    owner: 'Product Team',
    dueDate: 'Aug 15, 2026',
    status: 'pending',
    desc: 'Create step-by-step documentation for Feature X and add contextual tooltips to the 3 highest-friction points in the onboarding flow.',
    timeToImpact: '14–21 days',
    evidenceCount: 9,
  },
  {
    id: '4',
    title: 'Accelerate top 3 mid-market pipeline opportunities',
    objective: 'Revenue Growth',
    impact: 'Medium',
    effort: 'Medium',
    risk: 'Medium',
    expectedROI: '+₹66.3L potential revenue',
    confidence: 79,
    owner: 'Alex Chen',
    dueDate: 'Aug 31, 2026',
    status: 'accepted',
    desc: 'Three mid-market deals totaling ₹66.3L are in final stages. Proposal review acceleration and executive sponsorship can reduce close time by 12 days.',
    timeToImpact: '21–30 days',
    evidenceCount: 5,
  },
]

export const mockRevenueChart = Array.from({ length: 12 }, (_, i) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const base = 15300000 + i * 807500
  const prev = base * 0.88
  return {
    month: months[i],
    revenue: Math.round(base + (Math.random() - 0.45) * 1020000),
    prevRevenue: Math.round(prev + (Math.random() - 0.45) * 850000),
  }
})

export const mockForecastChart = [
  ...Array.from({ length: 6 }, (_, i) => ({
    month: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'][i],
    actual: [17850000, 19380000, 17425000, 20655000, 22015000, 24140000][i],
    forecast: null as number | null,
    upper: null as number | null,
    lower: null as number | null,
    isForecast: false,
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    month: ['Aug', 'Sep', 'Oct', 'Nov'][i],
    actual: null as number | null,
    forecast: [25160000, 26350000, 27540000, 28730000][i],
    upper: [27030000, 28730000, 30260000, 31960000][i],
    lower: [23290000, 23970000, 24820000, 25500000][i],
    isForecast: true,
  })),
]

export const mockHealthScore = {
  score: 74,
  label: 'Good',
  drivers: [
    { name: 'Revenue Growth', score: 85 },
    { name: 'Customer Health', score: 72 },
    { name: 'Operational Eff.', score: 68 },
    { name: 'Cash Flow', score: 80 },
    { name: 'Pipeline Health', score: 63 },
    { name: 'Team Performance', score: 78 },
  ],
}

export const mockDataSources = [
  { id: '1', name: 'Salesforce CRM', type: 'CRM', icon: '☁️', status: 'error', lastSync: '6 hours ago', quality: 62 },
  { id: '2', name: 'Tally ERP', type: 'Finance', icon: '📊', status: 'healthy', lastSync: '2 hours ago', quality: 96 },
  { id: '3', name: 'Google Analytics', type: 'Marketing', icon: '📈', status: 'healthy', lastSync: '30 min ago', quality: 99 },
  { id: '4', name: 'HubSpot', type: 'Marketing', icon: '🎯', status: 'healthy', lastSync: '1 hour ago', quality: 94 },
  { id: '5', name: 'Zendesk', type: 'Support', icon: '🎟️', status: 'syncing', lastSync: 'Syncing now...', quality: 91 },
  { id: '6', name: 'Revenue Data (CSV)', type: 'Spreadsheet', icon: '📋', status: 'healthy', lastSync: '1 day ago', quality: 87 },
]

export const mockUsers = [
  { id: '1', name: 'Sarah Mitchell', email: 'sarah@acmecorp.com', role: 'admin', lastActive: '2 min ago', status: 'active' },
  { id: '2', name: 'James Park', email: 'james@acmecorp.com', role: 'analyst', lastActive: '1 hour ago', status: 'active' },
  { id: '3', name: 'Alex Chen', email: 'alex@acmecorp.com', role: 'manager', lastActive: '3 hours ago', status: 'active' },
  { id: '4', name: 'Maya Rodriguez', email: 'maya@acmecorp.com', role: 'viewer', lastActive: '1 day ago', status: 'active' },
  { id: '5', name: 'Chris Lee', email: 'chris@acmecorp.com', role: 'analyst', lastActive: '3 days ago', status: 'inactive' },
]

export const mockAuditLogs = [
  { id: '1', action: 'User Login', actor: 'sarah@acmecorp.com', resource: 'Auth', timestamp: '2026-08-03 17:05:12', ip: '192.168.1.1' },
  { id: '2', action: 'Recommendation Accepted', actor: 'sarah@acmecorp.com', resource: 'Recommendation #1', timestamp: '2026-08-03 16:48:33', ip: '192.168.1.1' },
  { id: '3', action: 'Alert Rule Created', actor: 'james@acmecorp.com', resource: 'Alert Rules', timestamp: '2026-08-03 15:22:10', ip: '10.0.0.14' },
  { id: '4', action: 'Report Exported', actor: 'alex@acmecorp.com', resource: 'Executive Summary Q3', timestamp: '2026-08-03 14:10:55', ip: '10.0.0.22' },
  { id: '5', action: 'Data Source Connected', actor: 'sarah@acmecorp.com', resource: 'Google Analytics', timestamp: '2026-08-03 11:33:20', ip: '192.168.1.1' },
]

export const mockReports = [
  { id: '1', title: 'Executive Summary — August 2026', type: 'executive', date: 'Aug 3, 2026', status: 'ready', preview: 'Revenue grew 8.3% MoM driven by mid-market expansion. Enterprise churn risk requires immediate action. Pipeline coverage remains healthy at 3.2x. ARR stands at ₹28.99Cr with strong YoY growth of 12.4%.' },
  { id: '2', title: 'Weekly Business Review — W31', type: 'weekly', date: 'Aug 1, 2026', status: 'ready', preview: 'Deal velocity improved 12% week-over-week. Support load increased significantly in onboarding segment. Q3 pipeline target on track at ₹10.71Cr with 3 deals expected to close before month-end.' },
  { id: '3', title: 'Board Report — Q2 2026', type: 'board', date: 'Jul 15, 2026', status: 'ready', preview: 'Q2 closed at ₹66.3Cr revenue, 94% of target. ARR grew 28% YoY. Gross margin expanded to 78%. Customer count reached 412. NPS improved to 67, best score since Q3 2025.' },
  { id: '4', title: 'Customer Health Report — July', type: 'customer', date: 'Aug 1, 2026', status: 'ready', preview: 'Overall NPS improved to 67, best score since Q3 2025. Churn rate reduced to 2.1%. 34 accounts flagged for proactive outreach with combined ARR at risk of ₹3.57Cr.' },
]

export const mockSalesData = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
  newBusiness: Math.round(3400000 + i * 212500 + (Math.random() - 0.4) * 680000),
  expansion: Math.round(1530000 + i * 102000 + (Math.random() - 0.4) * 340000),
  churned: Math.round(510000 + (Math.random() - 0.4) * 170000),
}))

export const mockCustomerData = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
  total: 320 + i * 8 + Math.round((Math.random() - 0.4) * 5),
  new: Math.round(18 + (Math.random() - 0.4) * 8),
  churned: Math.round(4 + (Math.random() - 0.3) * 3),
  nps: Math.round(58 + i * 0.8 + (Math.random() - 0.4) * 4),
}))
