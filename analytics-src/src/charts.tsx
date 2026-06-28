import {
  Chart as ChartJS, BarElement, LineElement, PointElement, ArcElement,
  CategoryScale, LinearScale, Tooltip, Legend, BarController, LineController, DoughnutController,
} from 'chart.js';
import { Chart, Doughnut, Bar } from 'react-chartjs-2';
import type { MonthRec, Channel, LeadBucket } from './types';
import { monthLabel, fmtFull, fmtINR, CHART_PALETTE } from './lib';

ChartJS.register(
  BarElement, LineElement, PointElement, ArcElement,
  CategoryScale, LinearScale, Tooltip, Legend, BarController, LineController, DoughnutController,
);

export function RevenueChart({ months }: { months: MonthRec[] }) {
  const ms = months.slice(-12);
  const data = {
    labels: ms.map((m) => monthLabel(m.month)),
    datasets: [
      { type: 'bar' as const, label: 'Revenue', data: ms.map((m) => m.revenue), yAxisID: 'y', backgroundColor: '#0E3B35', borderRadius: 4, order: 2 },
      { type: 'line' as const, label: 'Occupancy %', data: ms.map((m) => m.occupancy), yAxisID: 'y1', borderColor: '#C9A227', backgroundColor: '#C9A227', tension: 0.3, pointRadius: 3, borderWidth: 2, order: 1 },
    ],
  };
  const options = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (c: any) => (c.dataset.yAxisID === 'y' ? '  Revenue: ' + fmtFull(c.raw) : '  Occupancy: ' + c.raw + '%'),
        },
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { callback: (v: any) => '₹' + Number(v) / 1000 + 'k', font: { size: 10 } } },
      y1: { position: 'right' as const, beginAtZero: true, max: 100, grid: { drawOnChartArea: false }, ticks: { callback: (v: any) => v + '%', font: { size: 10 } } },
      x: { ticks: { font: { size: 10 } } },
    },
  };
  return <Chart type="bar" data={data} options={options} />;
}

export function LeadTimeChart({ buckets }: { buckets: LeadBucket[] }) {
  const data = {
    labels: buckets.map((b) => b.label),
    datasets: [{ data: buckets.map((b) => b.count), backgroundColor: ['#1a7a44', '#3a8f5a', '#C9A227', '#d8a93a', '#C56B3E', '#c45a3a'], borderRadius: 4 }],
  };
  const total = buckets.reduce((s, b) => s + b.count, 0) || 1;
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c: any) => `  ${c.raw} bookings (${Math.round((c.raw / total) * 100)}%)` } },
    },
    scales: { y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } },
  };
  return <Bar data={data} options={options} />;
}

export function ChannelChart({ channels }: { channels: Channel[] }) {
  const total = channels.reduce((s, c) => s + c.revenue, 0) || 1;
  const data = {
    labels: channels.map((c) => c.name),
    datasets: [{ data: channels.map((c) => c.revenue), backgroundColor: CHART_PALETTE, borderWidth: 2, borderColor: '#fff' }],
  };
  const options = {
    responsive: true, maintainAspectRatio: false, cutout: '58%',
    plugins: {
      legend: { position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (c: any) => {
            const row = channels[c.dataIndex];
            return `  ${row.name}: ${fmtINR(row.revenue)} (${Math.round((row.revenue / total) * 100)}%) · ${row.bookings} bk`;
          },
        },
      },
    },
  };
  return <Doughnut data={data} options={options} />;
}
