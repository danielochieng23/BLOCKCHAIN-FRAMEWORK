import axios, { AxiosInstance, AxiosResponse } from 'axios';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string | null): void {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  // Generic HTTP methods
  async get<T = any>(url: string, params?: any): Promise<AxiosResponse<T>> {
    return this.api.get(url, { params });
  }

  async post<T = any>(url: string, data?: any): Promise<AxiosResponse<T>> {
    return this.api.post(url, data);
  }

  async put<T = any>(url: string, data?: any): Promise<AxiosResponse<T>> {
    return this.api.put(url, data);
  }

  async delete<T = any>(url: string): Promise<AxiosResponse<T>> {
    return this.api.delete(url);
  }

  // Identity endpoints
  async createIdentity(data: any) {
    return this.post('/identities', data);
  }

  async getIdentity(id: string) {
    return this.get(`/identities/${id}`);
  }

  async updateIdentity(id: string, data: any) {
    return this.put(`/identities/${id}`, data);
  }

  async getIdentityCredentials(id: string, type?: string) {
    return this.get(`/identities/${id}/credentials`, { type });
  }

  async createPresentation(id: string, data: any) {
    return this.post(`/identities/${id}/presentations`, data);
  }

  async signData(id: string, data: any) {
    return this.post(`/identities/${id}/sign`, { data });
  }

  async verifySignature(id: string, data: any, signature: string) {
    return this.post(`/identities/${id}/verify-signature`, { data, signature });
  }

  async deactivateIdentity(id: string) {
    return this.delete(`/identities/${id}`);
  }

  async reactivateIdentity(id: string) {
    return this.post(`/identities/${id}/reactivate`);
  }

  // Credential endpoints
  async issueCredential(data: any) {
    return this.post('/credentials/issue', data);
  }

  async getCredential(id: string) {
    return this.get(`/credentials/${id}`);
  }

  async verifyCredential(id: string) {
    return this.post(`/credentials/${id}/verify`);
  }

  async getHolderCredentials(address: string, filters?: any) {
    return this.get(`/credentials/holder/${address}`, filters);
  }

  async batchVerifyCredentials(credentialIds: string[]) {
    return this.post('/credentials/batch-verify', { credentialIds });
  }

  async createCredentialPresentation(data: any) {
    return this.post('/credentials/create-presentation', data);
  }

  async verifyPresentation(presentation: any) {
    return this.post('/credentials/verify-presentation', { presentation });
  }

  // Verification endpoints
  async requestVerification(data: any) {
    return this.post('/verification/request', data);
  }

  async getVerificationRequest(id: string) {
    return this.get(`/verification/requests/${id}`);
  }

  async respondToVerification(id: string, data: any) {
    return this.post(`/verification/respond/${id}`, data);
  }

  async getVerificationRequests(filters?: any) {
    return this.get('/verification/requests', filters);
  }

  async verifySubmittedPresentation(data: any) {
    return this.post('/verification/verify-presentation', data);
  }

  async cancelVerificationRequest(id: string, reason?: string) {
    return this.delete(`/verification/requests/${id}`, { data: { reason } });
  }

  async getVerificationStatistics() {
    return this.get('/verification/statistics');
  }

  // ZK Proof endpoints
  async getZKCircuits() {
    return this.get('/zkproofs/circuits');
  }

  async generateZKProof(data: any) {
    return this.post('/zkproofs/generate', data);
  }

  async verifyZKProof(data: any) {
    return this.post('/zkproofs/verify', data);
  }

  async batchVerifyZKProofs(data: any) {
    return this.post('/zkproofs/batch-verify', data);
  }

  async generateZKChallenge(data: any) {
    return this.post('/zkproofs/generate-challenge', data);
  }

  async checkNullifier(nullifier: string) {
    return this.get(`/zkproofs/nullifier/${nullifier}`);
  }

  async markNullifier(nullifier: string) {
    return this.post('/zkproofs/mark-nullifier', { nullifier });
  }

  async generateWitness(circuitType: string, inputs: any) {
    return this.post(`/zkproofs/witness/${circuitType}`, { inputs });
  }

  async getZKStatistics() {
    return this.get('/zkproofs/statistics');
  }

  // System endpoints
  async getApiInfo() {
    return this.get('/info');
  }

  async getHealthCheck() {
    return this.get('/../health');
  }
}

export const apiService = new ApiService();