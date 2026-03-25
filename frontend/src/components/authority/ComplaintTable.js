import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { complaintsAPI } from '../../utils/api'

const PRIORITY_BADGE = {
  3: <span className="badge-urgent">Urgent</span>,
  2: <span className="badge-progress">Moderate</span>,
  1: <span className="badge-pending">Low</span>,
}

export default function ComplaintTable({ complaints, workers }) {
  const qc = useQueryClient()
  const [assigning, setAssigning] = useState(null) // complaint id being assigned
  const [selectedWorker, setSelectedWorker] = useState({})

  const assignMutation = useMutation({
    mutationFn: ({ id, workerId }) => complaintsAPI.assign(id, workerId),
    onSuccess: () => {
      toast.success('Assigned successfully')
      qc.invalidateQueries(['urgent-complaints'])
      qc.invalidateQueries(['authority-dashboard'])
      setAssigning(null)
    },
    onError: () => toast.error('Assignment failed'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => complaintsAPI.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries(['urgent-complaints'])
    },
  })

  const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date)) / 1000
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  if (!complaints.length) {
    return (
      <div className="p-8 text-center text-sm text-gray-400">
        No urgent complaints at this time 🎉
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-3 text-left font-medium">Issue</th>
            <th className="px-4 py-3 text-left font-medium">Location</th>
            <th className="px-4 py-3 text-left font-medium">Priority</th>
            <th className="px-4 py-3 text-left font-medium">AI Type</th>
            <th className="px-4 py-3 text-left font-medium">Time</th>
            <th className="px-4 py-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {complaints.map(c => (
            <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <span className="font-medium text-gray-800 capitalize">
                  {c.issue_type.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="text-gray-500 text-xs max-w-32 truncate block">
                  {c.address || `${Number(c.lat).toFixed(4)}, ${Number(c.lng).toFixed(4)}`}
                </span>
              </td>
              <td className="px-4 py-3">{PRIORITY_BADGE[c.priority]}</td>
              <td className="px-4 py-3">
                {c.waste_type
                  ? <span className="text-primary-600 font-medium capitalize">{c.waste_type}</span>
                  : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">{timeAgo(c.created_at)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {assigning === c.id ? (
                    <div className="flex items-center gap-1">
                      <select
                        className="input py-1 text-xs w-32"
                        value={selectedWorker[c.id] || ''}
                        onChange={e => setSelectedWorker({ ...selectedWorker, [c.id]: e.target.value })}
                      >
                        <option value="">Pick worker</option>
                        {workers.filter(w => w.status === 'available').map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => assignMutation.mutate({ id: c.id, workerId: selectedWorker[c.id] })}
                        disabled={!selectedWorker[c.id] || assignMutation.isPending}
                        className="btn-primary py-1 text-xs px-2"
                      >
                        Go
                      </button>
                      <button onClick={() => setAssigning(null)} className="text-gray-400 text-xs">✕</button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setAssigning(c.id)}
                        className="text-xs text-authority-600 font-medium hover:underline"
                      >
                        Assign
                      </button>
                      {c.status !== 'resolved' && (
                        <button
                          onClick={() => statusMutation.mutate({ id: c.id, status: 'resolved' })}
                          className="text-xs text-primary-600 font-medium hover:underline"
                        >
                          Resolve
                        </button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
