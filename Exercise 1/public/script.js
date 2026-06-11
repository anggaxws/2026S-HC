const socket = io();
const statusEl = document.getElementById('status');
const statusDotEl = document.querySelector('.status-dot');
const angleEl = document.getElementById('angle');
const distanceEl = document.getElementById('distance');
const exportButtonEl = document.getElementById('export-data');
const chartCtx = document.getElementById('chart').getContext('2d');
const radarCanvas = document.getElementById('radar');
const radarCtx = radarCanvas.getContext('2d');
const closestDistanceEl = document.getElementById('closest-distance');
const closestAngleEl = document.getElementById('closest-angle');
const averageDistanceEl = document.getElementById('average-distance');
const activeZoneEl = document.getElementById('active-zone');
const zoneBreakdownEl = document.getElementById('zone-breakdown');
const zoneCountEls = {
  left: document.getElementById('zone-left-count'),
  center: document.getElementById('zone-center-count'),
  right: document.getElementById('zone-right-count'),
};
const zoneBarEls = {
  left: document.getElementById('zone-left-bar'),
  center: document.getElementById('zone-center-bar'),
  right: document.getElementById('zone-right-bar'),
};
const angleActivityEl = document.getElementById('angle-activity');

const radarConfig = {
  maxDistance: 300, // cm
  width: 0,
  height: 0,
  centerX: 0,
  centerY: 0,
  radius: 0,
  padding: {
    top: 28,
    right: 44,
    bottom: 24,
    left: 44,
  },
};

const radarData = {
  currentAngle: 0,
  objects: new Map(),
};

const invalidDistanceLabel = 'Out of range';
const maxEntries = 120;
const analyticsWindowSize = 60;
const analyticsReadings = [];
const exportReadings = [];
const angleBuckets = [
  { label: '0-30', min: 0, max: 30 },
  { label: '31-60', min: 31, max: 60 },
  { label: '61-90', min: 61, max: 90 },
  { label: '91-120', min: 91, max: 120 },
  { label: '121-150', min: 121, max: 150 },
  { label: '151-180', min: 151, max: 180 },
];

let readingCount = 0;

function resizeRadarCanvas() {
  const stageEl = radarCanvas.parentElement;
  const stageWidth = Math.max(320, Math.floor(stageEl.clientWidth));
  const cssWidth = Math.min(stageWidth, 860);
  const cssHeight = Math.round(cssWidth * 0.72);
  const dpr = window.devicePixelRatio || 1;

  radarCanvas.style.width = `${cssWidth}px`;
  radarCanvas.style.height = `${cssHeight}px`;
  radarCanvas.width = Math.floor(cssWidth * dpr);
  radarCanvas.height = Math.floor(cssHeight * dpr);

  radarCtx.setTransform(1, 0, 0, 1, 0, 0);
  radarCtx.scale(dpr, dpr);

  radarConfig.width = cssWidth;
  radarConfig.height = cssHeight;
  radarConfig.centerX = cssWidth / 2;
  radarConfig.centerY = cssHeight - radarConfig.padding.bottom;
  radarConfig.radius = Math.max(
    120,
    Math.min(
      (cssWidth - radarConfig.padding.left - radarConfig.padding.right) / 2,
      cssHeight - radarConfig.padding.top - radarConfig.padding.bottom
    )
  );
}

function buildAngleActivity() {
  angleActivityEl.innerHTML = '';
  angleBuckets.forEach((bucket) => {
    const column = document.createElement('div');
    column.className = 'activity-column';
    column.innerHTML = `
      <div class="activity-bar-track">
        <div class="activity-bar-fill" data-bucket="${bucket.label}"></div>
      </div>
      <div class="activity-label">${bucket.label}</div>
    `;
    angleActivityEl.appendChild(column);
  });
}

function drawRadar() {
  const { centerX, centerY, radius, maxDistance, width, height } = radarConfig;
  const ctx = radarCtx;

  ctx.fillStyle = '#e8eeea';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#98a3aa';
  ctx.lineWidth = 1;
  ctx.textBaseline = 'middle';

  for (let i = 1; i <= 4; i++) {
    const r = (radius / 4) * i;
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, Math.PI, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#55626c';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${(i * (maxDistance / 4)).toFixed(0)} cm`, centerX + r - 8, centerY - 8);
  }

  ctx.strokeStyle = '#98a3aa';
  ctx.lineWidth = 1;
  for (let angle = 0; angle <= 180; angle += 45) {
    const rad = (angle * Math.PI) / 180;
    const x = centerX + radius * Math.cos(rad);
    const y = centerY - radius * Math.sin(rad);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();

    const labelX = centerX + (radius + 30) * Math.cos(rad);
    const labelY = centerY - (radius + 30) * Math.sin(rad);
    ctx.fillStyle = '#55626c';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = angle === 0 ? 'left' : angle === 180 ? 'right' : 'center';
    ctx.fillText(angle.toString(), labelX, labelY);
  }

  const sweepRad = (radarData.currentAngle * Math.PI) / 180;
  ctx.strokeStyle = '#0f766e';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(
    centerX + radius * Math.cos(sweepRad),
    centerY - radius * Math.sin(sweepRad)
  );
  ctx.stroke();

  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  radarData.objects.forEach((obj) => {
    const objRad = (obj.angle * Math.PI) / 180;
    const objRadius = (obj.distance / radarConfig.maxDistance) * radius;
    const x = centerX + objRadius * Math.cos(objRad);
    const y = centerY - objRadius * Math.sin(objRad);

    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#55626c';
    ctx.font = '11px monospace';
    ctx.textAlign = x > centerX ? 'right' : 'left';
    const textOffset = x > centerX ? -10 : 10;
    ctx.fillText(`${obj.distance.toFixed(0)} cm`, x + textOffset, y - 10);
  });

  ctx.fillStyle = '#0f766e';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
  ctx.fill();
}

function updateRadarWithReading(reading) {
  radarData.currentAngle = reading.angle;
  const angleKey = Math.round(reading.angle);

  if (reading.valid) {
    radarData.objects.set(angleKey, reading);
  } else {
    radarData.objects.delete(angleKey);
  }

  drawRadar();
}

const chart = new Chart(chartCtx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      {
        label: 'Distance (cm)',
        data: [],
        borderColor: '#00daf3',
        backgroundColor: 'rgba(0, 218, 243, 0.25)',
        tension: 0.25,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#9cf0ff',
        pointBorderColor: '#08111f',
      },
    ],
  },
  options: {
    responsive: true,
    scales: {
      x: {
        ticks: {
          color: '#7d8ba3',
        },
        grid: {
          color: 'rgba(132, 147, 150, 0.14)',
        },
        title: { display: true, text: 'Reading' },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#7d8ba3',
        },
        grid: {
          color: 'rgba(132, 147, 150, 0.14)',
        },
        title: { display: true, text: 'Distance (cm)' },
      },
    },
    plugins: {
      legend: { display: false },
    },
  },
});

function getZone(angle) {
  if (angle < 60) return 'right';
  if (angle <= 120) return 'center';
  return 'left';
}

function escapeCsvValue(value) {
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function buildExportRow(reading) {
  const zone = reading.valid ? getZone(reading.angle) : 'none';
  return {
    timestamp_iso: new Date(reading.timestamp).toISOString(),
    timestamp_local: new Date(reading.timestamp).toLocaleString(),
    angle_deg: reading.angle.toFixed(0),
    distance_cm: reading.valid ? reading.distance.toFixed(1) : '',
    status: reading.valid ? 'detected' : 'out_of_range',
    zone,
    raw: reading.raw ?? '',
  };
}

function downloadCsv() {
  if (exportReadings.length === 0) {
    window.alert('No detection data available to export yet.');
    return;
  }

  const headers = [
    'timestamp_iso',
    'timestamp_local',
    'angle_deg',
    'distance_cm',
    'status',
    'zone',
    'raw',
  ];

  const rows = exportReadings.map((entry) => headers.map((header) => escapeCsvValue(entry[header] ?? '')).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  link.href = url;
  link.download = `radar-detection-log-${timestamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function updateAnalytics(reading) {
  analyticsReadings.push(reading);
  if (analyticsReadings.length > analyticsWindowSize) {
    analyticsReadings.shift();
  }

  const validReadings = analyticsReadings.filter((item) => item.valid);

  if (validReadings.length === 0) {
    closestDistanceEl.textContent = '-';
    closestAngleEl.textContent = 'No valid detection yet';
    averageDistanceEl.textContent = '-';
    activeZoneEl.textContent = '-';
    zoneBreakdownEl.textContent = 'Left 0 | Center 0 | Right 0';
    Object.values(zoneCountEls).forEach((el) => {
      el.textContent = '0';
    });
    Object.values(zoneBarEls).forEach((el) => {
      el.style.width = '0%';
    });
    angleActivityEl.querySelectorAll('.activity-bar-fill').forEach((bar) => {
      bar.style.height = '6px';
    });
    return;
  }

  const closestReading = validReadings.reduce((closest, current) => {
    return current.distance < closest.distance ? current : closest;
  });
  closestDistanceEl.textContent = `${closestReading.distance.toFixed(1)} cm`;
  closestAngleEl.textContent = `At ${closestReading.angle.toFixed(0)} deg`;

  const averageDistance =
    validReadings.reduce((sum, item) => sum + item.distance, 0) / validReadings.length;
  averageDistanceEl.textContent = `${averageDistance.toFixed(1)} cm`;

  const zoneCounts = { left: 0, center: 0, right: 0 };
  validReadings.forEach((item) => {
    zoneCounts[getZone(item.angle)] += 1;
  });

  const zoneOrder = ['left', 'center', 'right'];
  const busiestZone = zoneOrder.reduce((best, zone) => {
    return zoneCounts[zone] > zoneCounts[best] ? zone : best;
  }, 'left');

  activeZoneEl.textContent = busiestZone.charAt(0).toUpperCase() + busiestZone.slice(1);
  zoneBreakdownEl.textContent = `Left ${zoneCounts.left} | Center ${zoneCounts.center} | Right ${zoneCounts.right}`;

  const maxZoneCount = Math.max(1, zoneCounts.left, zoneCounts.center, zoneCounts.right);
  zoneOrder.forEach((zone) => {
    zoneCountEls[zone].textContent = zoneCounts[zone].toString();
    zoneBarEls[zone].style.width = `${(zoneCounts[zone] / maxZoneCount) * 100}%`;
  });

  angleBuckets.forEach((bucket) => {
    const count = validReadings.filter((item) => item.angle >= bucket.min && item.angle <= bucket.max).length;
    const bar = angleActivityEl.querySelector(`[data-bucket="${bucket.label}"]`);
    const height = Math.max(6, (count / Math.max(1, validReadings.length)) * 100);
    bar.style.height = `${height}%`;
  });
}

socket.on('status', (data) => {
  statusEl.textContent = data.connected ? `Connected (${data.message})` : `Disconnected: ${data.message || 'waiting...'}`;
  statusEl.style.color = data.connected ? '#0f766e' : '#dc2626';
  if (statusDotEl) {
    statusDotEl.style.backgroundColor = data.connected ? '#14b8a6' : '#dc2626';
    statusDotEl.style.boxShadow = data.connected
      ? 'none'
      : 'none';
  }
});

socket.on('reading', (reading) => {
  angleEl.textContent = reading.angle.toFixed(0);
  distanceEl.textContent = reading.valid ? reading.distance.toFixed(1) : invalidDistanceLabel;
  exportReadings.push(buildExportRow(reading));
  updateRadarWithReading(reading);
  updateChart(reading);
  updateAnalytics(reading);
});

function updateChart(reading) {
  if (!reading.valid) {
    return;
  }

  readingCount += 1;
  chart.data.labels.push(readingCount.toString());
  chart.data.datasets[0].data.push(reading.distance);
  if (chart.data.labels.length > maxEntries) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.update('none');
}

buildAngleActivity();
resizeRadarCanvas();
drawRadar();

window.addEventListener('resize', () => {
  resizeRadarCanvas();
  drawRadar();
});

if (exportButtonEl) {
  exportButtonEl.addEventListener('click', downloadCsv);
}
