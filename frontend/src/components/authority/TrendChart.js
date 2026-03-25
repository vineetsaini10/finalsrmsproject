import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler)

export default function TrendChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
        No trend data available
      </div>
    )
  }

  const labels = data.map(d => {
    try {
      return new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
    } catch { return d.date }
  })

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Total',
        data: data.map(d => d.total || 0),
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderColor: '#3b82f6',
        borderWidth: 2,
        borderRadius: 5,
        borderSkipped: false,
      },
      {
        label: 'Resolved',
        data: data.map(d => d.resolved || 0),
        backgroundColor: 'rgba(22, 163, 74, 0.2)',
        borderColor: '#16a34a',
        borderWidth: 2,
        borderRadius: 5,
        borderSkipped: false,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { boxWidth: 10, padding: 16, font: { size: 12, family: 'Inter' } },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 12, family: 'Inter' },
        bodyFont:  { size: 12, family: 'Inter' },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, family: 'Inter' }, color: '#94a3b8' },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148,163,184,0.08)' },
        ticks: { font: { size: 11, family: 'Inter' }, color: '#94a3b8', precision: 0 },
      },
    },
  }

  return (
    <div className="h-56">
      <Bar data={chartData} options={options} />
    </div>
  )
}
