import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

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

  getHorarios(data: string, profissionalId?: number): Observable<any> {
    let url = `${this.baseUrl}/horarios?data=${data}`;
    if (profissionalId) {
      url += `&profissional_id=${profissionalId}`;
    }
    return this.http.get(url);
  }

  getAdminDashboard(): Observable<any> {
    const url = `${this.baseUrl}/admin/dashboard`;
    return this.http.get(url);
  }

  getAdminAgendamentos(data: string): Observable<any> {
    const url = `${this.baseUrl}/admin/agendamentos?data=${data}`;
    return this.http.get(url);
  }

  liberarDia(data: string): Observable<any> {
    const url = `${this.baseUrl}/admin/horarios/liberar-dia`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(url, { data }, { headers });
  }

  liberarSemana(dataInicio: string, dataFim: string): Observable<any> {
    const url = `${this.baseUrl}/admin/horarios/liberar-semana`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(url, { data_inicio: dataInicio, data_fim: dataFim }, { headers });
  }

  liberarHorarioEspecifico(data: string, hora: string): Observable<any> {
    const url = `${this.baseUrl}/admin/horarios/liberar-horario`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(url, { data, hora }, { headers });
  }

  bloquearHorarioEspecifico(data: string, hora: string): Observable<any> {
    const url = `${this.baseUrl}/admin/horarios/bloquear-horario`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(url, { data, hora }, { headers });
  }

  bloquearDia(data: string): Observable<any> {
    const url = `${this.baseUrl}/admin/horarios/bloquear-dia`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(url, { data }, { headers });
  }

  salvarHorariosBatch(batchData: {data: string, alteracoes: Array<{time: string, status: 'livre' | 'bloqueado'}>}): Observable<any> {
    const url = `${this.baseUrl}/admin/horarios/salvar-batch`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(url, batchData, { headers });
  }

  // Gestão de Profissionais
  getUsuarios(): Observable<any> {
    const url = `${this.baseUrl}/usuarios`;
    return this.http.get(url);
  }

  criarProfissional(profissional: any): Observable<any> {
    const url = `${this.baseUrl}/profissionais`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(url, profissional, { headers });
  }

  atualizarProfissional(id: number, profissional: any): Observable<any> {
    const url = `${this.baseUrl}/profissionais/${id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put(url, profissional, { headers });
  }

  excluirProfissional(id: number): Observable<any> {
    const url = `${this.baseUrl}/profissionais/${id}`;
    return this.http.delete(url);
  }
}
