const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');
const API_BASE_URL = configuredApiUrl ? `${configuredApiUrl}/api` : '/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : { message: await response.text() };

      if (!response.ok) {
        const error = new Error(data.error || data.message || 'Erro na requisição');
        error.response = { data, status: response.status };
        throw error;
      }

      return data;
    } catch (error) {
      if (
        error.message &&
        (error.message.includes('Token expirado') || error.message.includes('Token inválido'))
      ) {
        this.logout();
      }

      throw error;
    }
  }

  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.token) {
      localStorage.setItem('token', response.token);
    }

    return response;
  }

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.token) {
      localStorage.setItem('token', response.token);
    }

    return response;
  }

  async updateProfile(profileData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async requestEmailChange(newEmail) {
    return this.request('/auth/email-change/request', {
      method: 'POST',
      body: JSON.stringify({ newEmail }),
    });
  }

  async confirmEmailChange(code) {
    return this.request('/auth/email-change/confirm', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async resendEmailChange() {
    return this.request('/auth/email-change/resend', {
      method: 'POST',
    });
  }

  async cancelEmailChange() {
    return this.request('/auth/email-change/cancel', {
      method: 'POST',
    });
  }

  async generateDiet(dietData) {
    return this.request('/nutrition/generate-diet', {
      method: 'POST',
      body: JSON.stringify(dietData),
    });
  }

  async getMyDiets() {
    return this.request('/nutrition/my-diets');
  }

  async deleteDiet(dietId) {
    return this.request(`/nutrition/diet/${dietId}`, {
      method: 'DELETE',
    });
  }

  async verifyToken() {
    return this.request('/auth/verify-token', {
      method: 'POST',
    });
  }

  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token, passwordData) {
    return this.request(`/auth/reset-password/${token}`, {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
  }

  async requestAccountDeletion() {
    return this.request('/auth/request-account-deletion', {
      method: 'POST',
    });
  }

  async confirmAccountDeletion(token) {
    return this.request(`/auth/confirm-account-deletion/${token}`, {
      method: 'POST',
    });
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  async setupProfile(profileData) {
    return this.request('/users/profile-setup', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  }

  async generateWorkout(workoutData) {
    return this.request('/workouts/generate', {
      method: 'POST',
      body: JSON.stringify(workoutData),
    });
  }

  async getMyWorkouts() {
    return this.request('/workouts/my-workouts');
  }

  async getWorkout(id) {
    return this.request(`/workouts/${id}`);
  }

  async completeWorkout(id, dados = {}) {
    return this.request(`/workouts/${id}/complete`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    });
  }

  async getWorkoutExecution(id) {
    return this.request(`/workouts/${id}/execucao`);
  }

  async saveWorkoutExecution(id, dados) {
    return this.request(`/workouts/${id}/execucao`, {
      method: 'PUT',
      body: JSON.stringify(dados),
    });
  }

  async controlWorkoutExecution(id, dados) {
    return this.request(`/workouts/${id}/execucao/controle`, {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  pauseWorkoutBeacon(id, vistoEm) {
    const token = localStorage.getItem('token');
    fetch(`${this.baseURL}/workouts/${id}/execucao/controle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ acao: 'pausar', vistoEm }),
      keepalive: true,
    }).catch(() => {});
  }

  async getWorkoutProgress(exercicioIds, excluirId) {
    const params = new URLSearchParams({ exercicios: exercicioIds.join(',') });
    if (excluirId) params.set('excluir', excluirId);
    return this.request(`/workouts/progresso?${params.toString()}`);
  }

  async getExerciseAlternatives(id, uid) {
    return this.request(`/workouts/${id}/exercicios/${encodeURIComponent(uid)}/alternativas`);
  }

  async swapExercise(id, uid, exercicioId, confirmar = false) {
    return this.request(`/workouts/${id}/exercicios/${encodeURIComponent(uid)}/trocar`, {
      method: 'POST',
      body: JSON.stringify({ exercicioId, confirmar }),
    });
  }

  async getWorkoutCycle(id) {
    return this.request(`/workouts/${id}/ciclo`);
  }

  async deleteWorkout(id) {
    return this.request(`/workouts/${id}`, {
      method: 'DELETE',
    });
  }

  async clearWorkoutHistory() {
    return this.request('/workouts', {
      method: 'DELETE',
    });
  }
}

export default new ApiService();
