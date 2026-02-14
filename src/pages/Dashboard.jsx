import { Link } from 'react-router-dom'

const metrics = [
  { label: 'Total Interactions', value: '12,847', change: '+8.3%', up: true },
  { label: 'Active Accounts', value: '3,291', change: '+2.1%', up: true },
  { label: 'Queries This Week', value: '587', change: '+14.7%', up: true },
  { label: 'Avg Response Time', value: '1.2s', change: '-23%', up: true },
]

const recentQueries = [
  { query: 'What were the top concerns from Enterprise accounts in Q4?', time: '2 min ago', status: 'answered' },
  { query: 'Summarize follow-up actions for Acme Corp last 30 days', time: '15 min ago', status: 'answered' },
  { query: 'Which accounts have pending renewal discussions?', time: '1 hr ago', status: 'answered' },
  { query: 'Show sentiment trends for Manufacturing segment', time: '3 hr ago', status: 'answered' },
]

const topAccounts = [
  { name: 'Acme Corporation', interactions: 234, sentiment: 'Positive', revenue: '$2.4M' },
  { name: 'GlobalTech Industries', interactions: 189, sentiment: 'Neutral', revenue: '$1.8M' },
  { name: 'Summit Healthcare', interactions: 156, sentiment: 'Positive', revenue: '$3.1M' },
  { name: 'Pacific Manufacturing', interactions: 142, sentiment: 'At Risk', revenue: '$950K' },
  { name: 'Eastside Logistics', interactions: 128, sentiment: 'Positive', revenue: '$1.2M' },
]

export default function Dashboard() {
  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of customer interactions and sales intelligence</p>
      </div>

      <div className="metrics-grid">
        {metrics.map(m => (
          <div key={m.label} className="metric-card">
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value}</div>
            <div className={`metric-change ${m.up ? 'up' : 'down'}`}>
              {m.change}
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h2>Recent AI Queries</h2>
            <Link to="/query" className="card-link">View All</Link>
          </div>
          <div className="query-list">
            {recentQueries.map((q, i) => (
              <div key={i} className="query-item">
                <div className="query-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <div className="query-details">
                  <div className="query-text">{q.query}</div>
                  <div className="query-meta">{q.time}</div>
                </div>
                <span className={`status-badge ${q.status}`}>{q.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Top Accounts</h2>
            <Link to="/interactions" className="card-link">View All</Link>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Interactions</th>
                <th>Sentiment</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topAccounts.map((a, i) => (
                <tr key={i}>
                  <td className="account-name">{a.name}</td>
                  <td>{a.interactions}</td>
                  <td>
                    <span className={`sentiment-badge ${a.sentiment.toLowerCase().replace(' ', '-')}`}>
                      {a.sentiment}
                    </span>
                  </td>
                  <td className="revenue">{a.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
