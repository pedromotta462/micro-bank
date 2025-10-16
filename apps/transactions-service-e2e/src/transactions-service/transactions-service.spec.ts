import axios from 'axios';

describe('GET /api', () => {
  it('should return a message', async () => {
    const res = await axios.get(`/api`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ message: 'Hello API' });
  });
});

describe('GET /api/health', () => {
  it('should return health status', async () => {
    const res = await axios.get(`/api/health`);

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('status', 'ok');
    expect(res.data).toHaveProperty('timestamp');
    expect(res.data).toHaveProperty('uptime');
    expect(res.data).toHaveProperty('environment');
    expect(res.data).toHaveProperty('version');
    expect(res.data).toHaveProperty('service');
    expect(typeof res.data.uptime).toBe('number');
    expect(typeof res.data.timestamp).toBe('string');
  });

  it('should return valid timestamp format', async () => {
    const res = await axios.get(`/api/health`);
    
    const timestamp = new Date(res.data.timestamp);
    expect(timestamp.toString()).not.toBe('Invalid Date');
  });

  it('should return positive uptime', async () => {
    const res = await axios.get(`/api/health`);
    
    expect(res.data.uptime).toBeGreaterThan(0);
  });

  it('should return correct service name', async () => {
    const res = await axios.get(`/api/health`);
    
    expect(res.data.service).toBe('transactions-service');
  });
});
