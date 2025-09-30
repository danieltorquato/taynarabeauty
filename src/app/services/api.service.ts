import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Storage } from '@ionic/storage-angular';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient, private storage: Storage) {}

  private async getAuthHeaders(): Promise<HttpHeaders> {
    const token = await this.storage.get('token');
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    if (token) {
      return headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  login(payload: { email: string; password: string }): Observable<any> {
    const url = `${this.baseUrl}/auth/login`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(url, payload, { headers });
  }

  createAppointment(payload: {
    procedimento_id: number;
    profissional_id: number;
    data: string; // YYYY-MM-DD
    hora: string; // HH:MM
    observacoes?: string;
    opcao_cilios?: string;
    cor_cilios?: string;
    opcao_labios?: string;
  }): Observable<any> {
    const url = `${this.baseUrl}/agendamentos`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(url, payload, { headers });
  }

  getProcedimentos(): Observable<any> {
    const url = `${this.baseUrl}/procedimentos`;
    return this.http.get(url);
  }

  getProfissionais(procedimentoId?: number): Observable<any> {
    let url = `${this.baseUrl}/profissionais`;
    if (procedimentoId) {
      url += `?procedimento_id=${procedimentoId}`;
    }
    return this.http.get(url);
  }

  getHorarios(data: string, profissionalId?: number, procedimentoId?: number): Observable<any> {
    let url = `${this.baseUrl}/horarios?data=${data}`;
    if (profissionalId) {
      url += `&profissional_id=${profissionalId}`;
    }
    if (procedimentoId) {
      url += `&procedimento_id=${procedimentoId}`;
    }
    return this.http.get(url);
  }

  getAdminDashboard(): Observable<any> {
    const url = `${this.baseUrl}/admin/dashboard`;
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.get(url, { headers }))
    );
  }

  getAdminAgendamentos(data: string): Observable<any> {
    const url = `${this.baseUrl}/admin/agendamentos?data=${data}`;
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.get(url, { headers }))
    );
  }

  liberarDia(data: string): Observable<any> {
    const url = `${this.baseUrl}/admin/horarios/liberar-dia`;
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.post(url, { data }, { headers }))
    );
  }

  liberarSemana(dataInicio: string, dataFim: string): Observable<any> {
    const url = `${this.baseUrl}/admin/horarios/liberar-semana`;
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.post(url, { data_inicio: dataInicio, data_fim: dataFim }, { headers }))
    );
  }

  liberarHorarioEspecifico(data: string, hora: string): Observable<any> {
    const url = `${this.baseUrl}/admin/horarios/liberar-horario`;
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.post(url, { data, hora }, { headers }))
    );
  }

  bloquearHorarioEspecifico(data: string, hora: string): Observable<any> {
    const url = `${this.baseUrl}/admin/horarios/bloquear-horario`;
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.post(url, { data, hora }, { headers }))
    );
  }

  bloquearDia(data: string): Observable<any> {
    const url = `${this.baseUrl}/admin/horarios/bloquear-dia`;
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.post(url, { data }, { headers }))
    );
  }

  salvarHorariosBatch(batchData: {
    data: string,
    alteracoes: Array<{time: string, status: 'livre' | 'bloqueado'}>,
    profissional_id?: number,
    procedimento_id?: number
  }): Observable<any> {
    const url = `${this.baseUrl}/admin/horarios/salvar-batch`;
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.post(url, batchData, { headers }))
    );
  }

  // Gestão de Profissionais
  getUsuarios(): Observable<any> {
    const url = `${this.baseUrl}/usuarios`;
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.get(url, { headers }))
    );
  }

  criarProfissional(profissional: any): Observable<any> {
    const url = `${this.baseUrl}/profissionais`;
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.post(url, profissional, { headers }))
    );
  }

  atualizarProfissional(id: number, profissional: any): Observable<any> {
    const url = `${this.baseUrl}/profissionais/${id}`;
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.put(url, profissional, { headers }))
    );
  }

  excluirProfissional(id: number): Observable<any> {
    const url = `${this.baseUrl}/profissionais/${id}`;
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.delete(url, { headers }))
    );
  }

  // Meus Agendamentos
  getMeusAgendamentos(): Observable<any> {
    const url = `${this.baseUrl}/meus-agendamentos`;
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.get(url, { headers }))
    );
  }

  cancelarAgendamento(id: number): Observable<any> {
    const url = `${this.baseUrl}/meus-agendamentos/${id}/cancelar`;
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.post(url, {}, { headers }))
    );
  }

  // Admin - Gerenciar Agendamentos
  aprovarAgendamento(id: number): Observable<any> {
    const url = `${this.baseUrl}/agendamentos/${id}/aprovar`;
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.post(url, {}, { headers }))
    );
  }

  rejeitarAgendamento(id: number, motivoRejeicao?: string): Observable<any> {
    const url = `${this.baseUrl}/agendamentos/${id}/rejeitar`;
    const body = motivoRejeicao ? { motivo_rejeicao: motivoRejeicao } : {};
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.post(url, body, { headers }))
    );
  }

  marcarFaltaAgendamento(id: number): Observable<any> {
    const url = `${this.baseUrl}/agendamentos/${id}/marcar-falta`;
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.post(url, {}, { headers }))
    );
  }

  cancelarAgendamentoAdmin(id: number): Observable<any> {
    const url = `${this.baseUrl}/agendamentos/${id}/cancelar`;
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.post(url, {}, { headers }))
    );
  }

  desmarcarAgendamento(id: number, justificativa: string): Observable<any> {
    const url = `${this.baseUrl}/agendamentos/${id}/desmarcar`;
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => this.http.post(url, { justificativa }, { headers }))
    );
  }
}
