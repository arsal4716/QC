import React, { useState, useEffect } from 'react';
import { getCostStats } from '../api/costApi';
import { toast } from 'react-toastify';

const CostDashboard = () => {
  const [stats, setStats] = useState({
    totalProcessed: 0,
    avgCostPerMinute: 0,
    avgLLMCost: 0,
    totalSpent: 0,
    remainingBalance: 0,
    deepgramUsage: 0,
    openaiUsage: 0
  });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCostData();
  }, []);

  const loadCostData = async () => {
    try {
      setLoading(true);
      const data = await getCostStats();
      setStats(data.stats);
      setPaymentHistory(data.paymentHistory || []);
    } catch (error) {
      console.error('Failed to load cost data:', error);
      toast.error('Failed to load cost information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4" style={{ backgroundColor: '#12172b', minHeight: '100vh' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="text-primary">Welcome Back HLG!</h1>
        <div className="text-muted">
          <small>Last updated: {new Date().toLocaleDateString()}</small>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card h-100 shadow-sm">
            <div className="card-body text-center">
              <h6 className="card-title text-muted">Total Processed Calls</h6>
              <h3 className="text-primary">{stats.totalProcessed.toLocaleString()}</h3>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-3">
          <div className="card h-100 shadow-sm">
            <div className="card-body text-center">
              <h6 className="card-title text-muted">Avg Cost/Minute</h6>
              <h3 className="text-success">${stats.avgCostPerMinute.toFixed(4)}</h3>
              <small className="text-muted">Deepgram Transcription</small>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-3">
          <div className="card h-100 shadow-sm">
            <div className="card-body text-center">
              <h6 className="card-title text-muted">Avg LLM Cost</h6>
              <h3 className="text-info">${stats.avgLLMCost.toFixed(4)}</h3>
              <small className="text-muted">OpenAI Processing</small>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-3">
          <div className="card h-100 shadow-sm">
            <div className="card-body text-center">
              <h6 className="card-title text-muted">Total Spent</h6>
              <h3 className="text-danger">${stats.totalSpent.toLocaleString()}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Account Balance</h5>
            </div>
            <div className="card-body text-center">
              <h2 className="text-success">${stats.remainingBalance.toLocaleString()} Remaining</h2>
              <div className="progress mt-3" style={{ height: '20px' }}>
                <div 
                  className="progress-bar bg-success" 
                  role="progressbar" 
                  style={{ width: `${(stats.remainingBalance / (stats.totalSpent + stats.remainingBalance)) * 100}%` }}
                  aria-valuenow={stats.remainingBalance}
                  aria-valuemin="0"
                  aria-valuemax={stats.totalSpent + stats.remainingBalance}
                >
                  {((stats.remainingBalance / (stats.totalSpent + stats.remainingBalance)) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 mb-3">
          <div className="card shadow-sm">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">Service Usage</h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-6">
                  <h6>Deepgram Usage</h6>
                  <h4 className="text-primary">{stats.deepgramUsage.toLocaleString()} min</h4>
                </div>
                <div className="col-6">
                  <h6>OpenAI Usage</h6>
                  <h4 className="text-success">{stats.openaiUsage.toLocaleString()} calls</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-dark text-white">
          <h5 className="mb-0">Payment History</h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Payment Date</th>
                  <th>Payment by</th>
                  <th>Type</th>
                  <th>System</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment, index) => (
                  <tr key={index}>
                    <td>{payment.date}</td>
                    <td>{payment.by}</td>
                    <td>
                      <span className={`badge ${payment.type === 'Deposit' ? 'bg-success' : 'bg-warning'}`}>
                        {payment.type}
                      </span>
                    </td>
                    <td>{payment.system}</td>
                    <td>${payment.amount}</td>
                    <td>
                      <span className={`badge ${payment.status === 'Completed' ? 'bg-success' : 'bg-secondary'}`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {paymentHistory.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4">
                      No payment history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="card shadow-sm mt-4">
        <div className="card-header bg-secondary text-white">
          <h5 className="mb-0">Cost Breakdown</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h6>Deepgram Transcription Costs</h6>
              <ul className="list-group">
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Audio Minutes Processed
                  <span className="badge bg-primary rounded-pill">{stats.deepgramUsage} min</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Cost per Minute
                  <span className="badge bg-info rounded-pill">${stats.avgCostPerMinute.toFixed(4)}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Total Transcription Cost
                  <span className="badge bg-success rounded-pill">
                    ${(stats.deepgramUsage * stats.avgCostPerMinute).toFixed(2)}
                  </span>
                </li>
              </ul>
            </div>
            <div className="col-md-6">
              <h6>OpenAI Processing Costs</h6>
              <ul className="list-group">
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Calls Processed
                  <span className="badge bg-primary rounded-pill">{stats.openaiUsage} calls</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Avg Cost per Call
                  <span className="badge bg-info rounded-pill">${stats.avgLLMCost.toFixed(4)}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Total AI Processing Cost
                  <span className="badge bg-success rounded-pill">
                    ${(stats.openaiUsage * stats.avgLLMCost).toFixed(2)}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostDashboard;