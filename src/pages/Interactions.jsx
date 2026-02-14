import { useState } from 'react'

const interactionsData = [
  { id: 1, account: 'Acme Corporation', contact: 'Sarah Johnson', type: 'Call', date: '2026-02-14', subject: 'Q1 Contract Renewal Discussion', sentiment: 'Positive', rep: 'Mike Chen', summary: 'Discussed renewal terms for Q1. Customer expressed satisfaction with current service levels. Potential upsell for premium support tier.' },
  { id: 2, account: 'GlobalTech Industries', contact: 'David Park', type: 'Email', date: '2026-02-13', subject: 'Pricing Inquiry - Bulk Orders', sentiment: 'Neutral', rep: 'Lisa Wang', summary: 'Customer inquired about volume discount pricing for office supplies. Sent detailed pricing matrix. Follow-up scheduled for next week.' },
  { id: 3, account: 'Summit Healthcare', contact: 'Dr. Emily Roberts', type: 'Meeting', date: '2026-02-13', subject: 'Annual Business Review', sentiment: 'Positive', rep: 'James Miller', summary: 'Comprehensive annual review. Customer highlighted 15% cost savings. Interested in expanding to 3 additional facilities.' },
  { id: 4, account: 'Pacific Manufacturing', contact: 'Tom Williams', type: 'Call', date: '2026-02-12', subject: 'Delivery Delay Complaint', sentiment: 'Negative', rep: 'Mike Chen', summary: 'Customer reported delays on last 3 orders. Escalated to logistics team. Offered expedited shipping credit as goodwill gesture.' },
  { id: 5, account: 'Eastside Logistics', contact: 'Karen Lee', type: 'Email', date: '2026-02-12', subject: 'New Product Category Request', sentiment: 'Positive', rep: 'Lisa Wang', summary: 'Customer looking to source industrial equipment through Amazon Business. Sent catalog and set up demo for procurement portal.' },
  { id: 6, account: 'Metro Education District', contact: 'Principal Mark Davis', type: 'Meeting', date: '2026-02-11', subject: 'School Supply Program Proposal', sentiment: 'Positive', rep: 'James Miller', summary: 'Presented bulk school supply program for 12 schools. Strong interest in automated reordering. Proposal sent for board review.' },
  { id: 7, account: 'Riverside Hotels Group', contact: 'Anna Martinez', type: 'Call', date: '2026-02-11', subject: 'Account Access Issues', sentiment: 'Negative', rep: 'Mike Chen', summary: 'Multiple users unable to access procurement portal. IT support ticket created. Temporary workaround provided.' },
  { id: 8, account: 'TechStart Inc.', contact: 'Jason Patel', type: 'Email', date: '2026-02-10', subject: 'Startup Program Enrollment', sentiment: 'Positive', rep: 'Lisa Wang', summary: 'New customer interested in Amazon Business startup program. Completed onboarding questionnaire. Account setup in progress.' },
  { id: 9, account: 'Federal Agency - GSA', contact: 'Robert Thompson', type: 'Meeting', date: '2026-02-10', subject: 'Government Procurement Compliance', sentiment: 'Neutral', rep: 'James Miller', summary: 'Reviewed compliance requirements for government procurement. Additional documentation needed for FedRAMP authorization.' },
  { id: 10, account: 'Acme Corporation', contact: 'Sarah Johnson', type: 'Email', date: '2026-02-09', subject: 'Feature Request - Reporting Dashboard', sentiment: 'Neutral', rep: 'Mike Chen', summary: 'Customer requested enhanced spend analytics dashboard with department-level breakdowns. Forwarded to product team.' },
]

const typeFilters = ['All', 'Call', 'Email', 'Meeting']
const sentimentFilters = ['All', 'Positive', 'Neutral', 'Negative']

export default function Interactions() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [sentimentFilter, setSentimentFilter] = useState('All')
  const [expandedRow, setExpandedRow] = useState(null)

  const filtered = interactionsData.filter(item => {
    const matchesSearch = !search ||
      item.account.toLowerCase().includes(search.toLowerCase()) ||
      item.contact.toLowerCase().includes(search.toLowerCase()) ||
      item.subject.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'All' || item.type === typeFilter
    const matchesSentiment = sentimentFilter === 'All' || item.sentiment === sentimentFilter
    return matchesSearch && matchesType && matchesSentiment
  })

  return (
    <div className="interactions-page">
      <div className="page-header">
        <div>
          <h1>Customer Interactions</h1>
          <p>Browse and filter all customer interaction records</p>
        </div>
        <div className="header-stats">
          <span className="stat">{filtered.length} of {interactionsData.length} interactions</span>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-filter">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search accounts, contacts, subjects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Type:</label>
          <div className="filter-pills">
            {typeFilters.map(f => (
              <button
                key={f}
                className={`filter-pill ${typeFilter === f ? 'active' : ''}`}
                onClick={() => setTypeFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Sentiment:</label>
          <div className="filter-pills">
            {sentimentFilters.map(f => (
              <button
                key={f}
                className={`filter-pill ${sentimentFilter === f ? 'active' : ''}`}
                onClick={() => setSentimentFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <table className="data-table interactions-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Account</th>
              <th>Contact</th>
              <th>Type</th>
              <th>Subject</th>
              <th>Sentiment</th>
              <th>Rep</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <>
                <tr
                  key={item.id}
                  className={`clickable-row ${expandedRow === item.id ? 'expanded' : ''}`}
                  onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                >
                  <td className="date-cell">{item.date}</td>
                  <td className="account-name">{item.account}</td>
                  <td>{item.contact}</td>
                  <td>
                    <span className={`type-badge ${item.type.toLowerCase()}`}>{item.type}</span>
                  </td>
                  <td className="subject-cell">{item.subject}</td>
                  <td>
                    <span className={`sentiment-badge ${item.sentiment.toLowerCase()}`}>
                      {item.sentiment}
                    </span>
                  </td>
                  <td>{item.rep}</td>
                </tr>
                {expandedRow === item.id && (
                  <tr key={`${item.id}-detail`} className="detail-row">
                    <td colSpan="7">
                      <div className="detail-content">
                        <strong>Summary:</strong> {item.summary}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="empty-table">
            <p>No interactions match your filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
