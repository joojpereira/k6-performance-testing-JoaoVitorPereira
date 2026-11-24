import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

export const getDuration = new Trend('get_duration', true);
export const RateContentOK = new Rate('content_OK');

export const options = {
  scenarios: {
    rampa: {
      executor: 'ramping-vus',
      startVUs: 7,
      stages: [
        { duration: '1m', target: 45 }, // 7 -> 45 VUs
        { duration: '1m30s', target: 92 }, // 45 -> 92 VUs
        { duration: '1m', target: 92 } // mantém o pico
      ], // total: 3m30s
      gracefulRampDown: '30s'
    }
  },
  thresholds: {
    http_req_duration: ['p(90)<6800'], // 90% das respostas abaixo de 6800ms
    http_req_failed: ['rate<0.25'], // menos de 25% de erro
    content_OK: ['rate>0.75'] // pelo menos 75% de respostas 200
  }
};

export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

export default function () {
  const baseUrl = __ENV.BASE_URL || 'https://dummyjson.com/products';

  const res = http.get(baseUrl);

  getDuration.add(res.timings.duration);
  RateContentOK.add(res.status === 200);

  check(res, {
    'GET - Status 200': r => r.status === 200
  });

  sleep(1);
}
