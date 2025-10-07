import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'recepcao' | 'profissional' | 'cliente';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _user = new BehaviorSubject<User | null>(null);
  private _isAuthenticated = new BehaviorSubject<boolean>(false);
  public _initialized = false;

  constructor(private storage: Storage, private api: ApiService) {
    this.loadStoredUser();
  }

  get user$(): Observable<User | null> {
    return this._user.asObservable();
  }

  get isAuthenticated$(): Observable<boolean> {
    return this._isAuthenticated.asObservable();
  }

  get currentUser(): User | null {
    return this._user.value;
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated.value;
  }

  private async loadStoredUser() {
    try {
      // Aguardar o storage estar pronto
      await this.storage.create();

      const user = await this.storage.get('user');
      const token = await this.storage.get('token');

      if (user && token) {
        this._user.next(user);
        this._isAuthenticated.next(true);
      } else {
        // Limpar dados inválidos se existirem
        await this.storage.remove('user');
        await this.storage.remove('token');
        this._user.next(null);
        this._isAuthenticated.next(false);
      }

      this._initialized = true;
    } catch (error) {
      console.error('Erro ao carregar usuário armazenado:', error);
      // Em caso de erro, garantir que o usuário não esteja autenticado
      this._user.next(null);
      this._isAuthenticated.next(false);
      this._initialized = true;
    }
  }

  setUserData(user: User, token: string) {
    // Definir os dados imediatamente para evitar problemas de timing
    this._user.next(user);
    this._isAuthenticated.next(true);

    // Salvar no storage de forma assíncrona (sem bloquear)
    this.storage.set('user', user).catch(error => {
      console.error('Erro ao salvar usuário no storage:', error);
    });
    this.storage.set('token', token).catch(error => {
      console.error('Erro ao salvar token no storage:', error);
    });
  }

  async logout() {
    try {
      await this.storage.remove('user');
      await this.storage.remove('token');
      this._user.next(null);
      this._isAuthenticated.next(false);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.api.login(credentials).pipe(
      switchMap((response: any) => {
        if (response.success && response.user && response.token) {
          // Definir dados imediatamente
          this.setUserData(response.user, response.token);
          return from(Promise.resolve(response));
        } else {
          throw new Error(response.message || 'Erro no login');
        }
      })
    );
  }

  loginAndConfirmAppointment(credentials: { email: string; password: string }): Observable<any> {
    return this.login(credentials).pipe(
      switchMap((response: any) => {
        if (response.success) {
          return this.confirmPendingAppointment().pipe(
            switchMap((appointmentResult: any) => {
              return from(Promise.resolve({
                ...response,
                appointmentConfirmed: appointmentResult?.success || false,
                appointmentData: appointmentResult?.data || null
              }));
            })
          );
        }
        return from(Promise.resolve(response));
      })
    );
  }

  private confirmPendingAppointment(): Observable<any> {
    const savedData = localStorage.getItem('tempAppointmentData');
    if (!savedData) {
      return from(Promise.resolve({ success: false, message: 'Nenhum agendamento pendente' }));
    }

    try {
      const appointmentData = JSON.parse(savedData);
      console.log('Dados do agendamento salvos:', appointmentData);

      // Preparar dados para a API
      const apiData = {
        procedimento_id: appointmentData.selectedProcedimento,
        profissional_id: appointmentData.selectedProfissional === 0 ? this.getNextProfissionalInQueue(appointmentData.selectedProcedimento) : appointmentData.selectedProfissional,
        data: appointmentData.selectedDate ? appointmentData.selectedDate.slice(0, 10) : '',
        hora: appointmentData.selectedTime,
        observacoes: this.buildObservacoes(appointmentData),
        opcao_cilios: appointmentData.tipoCilios || undefined,
        cor_cilios: appointmentData.corCilios || undefined,
        opcao_labios: appointmentData.corLabios || undefined,
      };

      console.log('Dados enviados para API de agendamento:', apiData);

      return this.api.createAppointment(apiData).pipe(
        switchMap((result: any) => {
          console.log('Resposta da API de agendamento:', result);
          if (result.success) {
            // Construir dados completos do agendamento para a página de confirmação
            const profissionalId = appointmentData.selectedProfissional === 0 ? this.getNextProfissionalInQueue(appointmentData.selectedProcedimento) : appointmentData.selectedProfissional;
            const profissionalNome = appointmentData.selectedProfissional === 0 ? this.getProfissionalNome(profissionalId) : this.getProfissionalNome(appointmentData.selectedProfissional);

            const completeAppointmentData = {
              id: result.id,
              whatsapp: result.whatsapp,
              emailSent: result.emailSent,
              // Dados do agendamento original
              procedimento_nome: this.getProcedimentoNome(appointmentData.selectedProcedimento),
              data: appointmentData.selectedDate ? this.formatDate(appointmentData.selectedDate) : '',
              hora: appointmentData.selectedTime || '',
              profissional_nome: profissionalNome,
              observacoes: this.buildObservacoes(appointmentData)
            };

            console.log('Dados completos construídos:', completeAppointmentData);
            console.log('Profissional selecionado:', appointmentData.selectedProfissional);
            console.log('Profissional ID final:', profissionalId);
            console.log('Nome da profissional:', profissionalNome);

            // Limpar dados temporários
            localStorage.removeItem('tempAppointmentData');
            return from(Promise.resolve({
              success: true,
              data: completeAppointmentData,
              message: 'Agendamento confirmado automaticamente'
            }));
          } else {
            return from(Promise.resolve({
              success: false,
              message: result.message || 'Erro ao confirmar agendamento'
            }));
          }
        })
      );
    } catch (error) {
      return from(Promise.resolve({
        success: false,
        message: 'Erro ao processar dados do agendamento'
      }));
    }
  }

  private getNextProfissionalInQueue(procedimentoId: number): number {
    // Lógica baseada nas especializações dos profissionais
    // Taynara (ID 1) - Especialista em cílios (procedimento_id 1, 2, 3, 5, 6)
    // Mayara (ID 2) - Especialista em lábios (procedimento_id 4)
    // Sara (ID 3) - Especialista em lábios (procedimento_id 4)

    if (procedimentoId === 4) {
      // Para procedimentos de lábios, usar Mayara como padrão
      return 2;
    } else {
      // Para procedimentos de cílios, usar Taynara como padrão
      return 1;
    }
  }

  private buildObservacoes(appointmentData: any): string | undefined {
    const parts: string[] = [];

    if (appointmentData.tipoCilios) {
      parts.push(`Tipo: ${appointmentData.tipoCilios}`);
    }
    if (appointmentData.corCilios) {
      parts.push(`Cor: ${appointmentData.corCilios}`);
    }
    if (appointmentData.corLabios) {
      parts.push(`Cor: ${appointmentData.corLabios}`);
    }
    if (appointmentData.note) {
      parts.push(appointmentData.note);
    }

    return parts.length ? parts.join(' | ') : undefined;
  }

  private getProcedimentoNome(procedimentoId: number): string {
    // Mapeamento simples - em uma implementação real, você buscaria da API
    const procedimentos: { [key: number]: string } = {
      1: 'Extensão de Cílios',
      2: 'Design de Sobrancelhas',
      3: 'Micropigmentação',
      4: 'Lash Lifting',
      5: 'Brow Lamination'
    };
    return procedimentos[procedimentoId] || 'Procedimento';
  }

  private getProfissionalNome(profissionalId: number): string {
    // Mapeamento baseado nos profissionais reais do sistema
    const profissionais: { [key: number]: string } = {
      1: 'Taynara Casagrande',
      2: 'Mayara Casagrande',
      3: 'Sara Casagrande'
    };
    return profissionais[profissionalId] || 'Profissional';
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      return dateString;
    }
  }

  hasRole(requiredRole: string | string[]): boolean {
    const user = this.currentUser;

    if (!user) {
      return false;
    }

    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }

    return user.role === requiredRole;
  }

  canAccessAdmin(): boolean {
    return this.hasRole(['admin', 'recepcao']);
  }

  canAccessProfissional(): boolean {
    return this.hasRole(['admin', 'recepcao', 'profissional']);
  }

  canAccessGestaoProfissionais(): boolean {
    return this.hasRole(['admin']);
  }

  canAccessAgendamentos(): boolean {
    return this.hasRole(['admin', 'recepcao', 'profissional', 'cliente']);
  }

  canAccessDashboard(): boolean {
    return this.hasRole(['admin', 'recepcao']);
  }
}
