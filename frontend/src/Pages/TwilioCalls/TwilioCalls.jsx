import React from 'react';
import { useGetCallsQuery } from '../../store/api/twilioCalls';


export default function TwilioCalls() {
  const { data = [], isLoading } = useGetCallsQuery();

  if (isLoading) return <p>Loading calls...</p>;

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Call Tracking</h1>
      <table className="table table-striped table-hover">
        <thead className="table-dark">
          <tr>
            <th scope="col">From</th>
            <th scope="col">Call Center</th>
            <th scope="col">Duration</th>
            <th scope="col">Recording</th>
          </tr>
        </thead>
        <tbody>
          {data.map(call => (
            <tr key={call._id}>
              <td>{call.from}</td>
              <td>{call.callCenter}</td>
              <td>{call.duration || 0}s</td>
              <td>
                {call.recordingUrl ? (
                  <a href={call.recordingUrl} target="_blank" rel="noopener noreferrer">
                    <i className="bi-play-circle"></i> Play
                  </a>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
