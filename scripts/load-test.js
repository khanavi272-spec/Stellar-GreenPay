import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const donationLatency = new Trend('donation_latency', true);
const donationErrors = new Counter('donation_errors');

export const options = {
  vus: 100,
  duration: '60s',
  thresholds: {
    // p95 must stay under 500 ms — see docs/performance.md for rationale
    'donation_latency': ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const SAMPLE_ADDRESSES = [
  'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3A73ZFMZE',
  'GBVNNPOFVILBYQZLTDAL2QXAHVDYCSQXFMOUQ73XU3NKLHZB6KPRSEV',
  'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGBQH9L3BKQBFHV7HJZQZD',
];

export default function () {
  const donor = SAMPLE_ADDRESSES[Math.floor(Math.random() * SAMPLE_ADDRESSES.length)];

  const payload = JSON.stringify({
    projectId: `project-${Math.ceil(Math.random() * 10)}`,
    amountXlm: (Math.random() * 9 + 1).toFixed(2),
    donorAddress: donor,
    memo: 'load-test',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'POST /api/donations' },
  };

  const res = http.post(`${BASE_URL}/api/donations`, payload, params);

  donationLatency.add(res.timings.duration);

  const ok = check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    'response has donationId': (r) => {
      try {
        return !!JSON.parse(r.body).donationId;
      } catch {
        return false;
      }
    },
  });

  if (!ok) donationErrors.add(1);

  sleep(0.5 + Math.random() * 0.5);
}
