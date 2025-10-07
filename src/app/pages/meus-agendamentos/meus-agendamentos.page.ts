import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonCard, IonCardHeader, IonCardContent, IonButton, IonChip, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons, IonIcon, IonSegmentButton, IonSegment, IonLabel, IonModal, IonList, IonItem, IonTextarea, AlertController } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { addIcons } from 'ionicons';
import { calendarOutline, timeOutline, personOutline, checkmarkCircleOutline, closeCircleOutline, informationCircleOutline, schoolOutline, closeOutline, alertCircleOutline, checkmarkOutline, closeOutline as closeIcon, chatbubbleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-meus-agendamentos',
  templateUrl: './meus-agendamentos.page.html',
  styleUrls: ['./meus-agendamentos.page.scss'],
  standalone: true,
  imports: [IonLabel, IonSegmentButton, IonIcon, IonButtons, IonBackButton, IonTitle, IonToolbar, IonHeader, IonChip, IonButton, IonCardContent, IonCardHeader, IonCard, IonContent, IonSegment, IonSegmentButton, IonLabel, IonModal, IonList, IonTextarea, CommonModule, FormsModule]
})
export class MeusAgendamentosPage implements OnInit {
  agendamentos: any[] = [];
  agendamentosFiltrados: any[] = [];
  agendamentosAtivos: any[] = [];
  agendamentosConcluidos: any[] = [];
  loading = false;
  selectedAgendamento: any = null;
  showDetails = false;
  selectedSegment = 'todos';
  showHistoryModal = false;
  historicoAgendamentos: any[] = [];

  // Propriedades para aprovação/rejeição
  showApprovalModal = false;
  showRejectionModal = false;
  selectedAgendamentoForAction: any = null;
  approvalMessage = '';
  rejectionMessage = '';
  isProcessing = false;

  constructor(
    public authService: AuthService,
    private api: ApiService,
    private router: Router,
    private alertController: AlertController
  ) {
    addIcons({timeOutline,calendarOutline,personOutline,informationCircleOutline,closeCircleOutline,closeOutline,alertCircleOutline,checkmarkCircleOutline,schoolOutline,checkmarkOutline,closeIcon,chatbubbleOutline});
  }

  // Mostrar alert de confirmação
  async showConfirmAlert(
    title: string,
    message: string,
    confirmText: string = 'Sim',
    cancelText: string = 'Cancelar'
  ): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: title,
        message: message,
        buttons: [
          {
            text: cancelText,
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: confirmText,
            handler: () => resolve(true)
          }
        ]
      });
      await alert.present();
    });
  }

  // Mostrar alert de sucesso
  async showSuccessAlert(message: string) {
    const alert = await this.alertController.create({
      header: '✅ Sucesso',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  // Mostrar alert de erro
  async showErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: '❌ Erro',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  ngOnInit() {
    console.log('=== MEUS AGENDAMENTOS - ngOnInit ===');
    console.log('AuthService inicializado:', this.authService._initialized);
    console.log('Usuário atual:', this.authService.currentUser);
    console.log('Está autenticado:', this.authService.isAuthenticated);
    this.carregarAgendamentos();
  }

  carregarAgendamentos() {
    console.log('=== CARREGANDO AGENDAMENTOS ===');
    this.loading = true;
    console.log('Loading set to true');

    this.api.getMeusAgendamentos().subscribe({
      next: (res) => {
        console.log('Resposta da API recebida:', res);
        this.loading = false;
        console.log('Loading set to false');

        if (res.success) {
          let agendamentos = res.agendamentos || [];
          console.log('Agendamentos recebidos:', agendamentos.length);

          // Filtrar agendamentos baseado no role do usuário
          const currentUser = this.authService.currentUser;
          console.log('Usuário atual para filtro:', currentUser);

          if (currentUser) {
            if (currentUser.role === 'admin' || currentUser.role === 'recepcao') {
              // Admin e recepção veem todos os agendamentos
              this.agendamentos = agendamentos;
              console.log('Filtro admin/recepção aplicado:', this.agendamentos.length);
            } else if (currentUser.role === 'profissional') {
              // Profissional vê apenas agendamentos onde ele é responsável
              this.agendamentos = agendamentos.filter((ag: any) =>
                ag.profissional_id === currentUser.id || ag.profissional_id == currentUser.id
              );
              console.log('Filtro profissional aplicado:', this.agendamentos.length);
            } else {
              // Cliente vê apenas seus próprios agendamentos
              this.agendamentos = agendamentos;
              console.log('Filtro cliente aplicado:', this.agendamentos.length);
            }
          } else {
            this.agendamentos = agendamentos;
            console.log('Sem usuário, usando todos os agendamentos:', this.agendamentos.length);
          }

          console.log('Agendamentos finais:', this.agendamentos);
          console.log('Chamando separarAgendamentos...');
          // Separar agendamentos ativos dos concluídos
          this.separarAgendamentos();
          console.log('Chamando filtrarAgendamentos...');
          this.filtrarAgendamentos();
          console.log('Agendamentos filtrados:', this.agendamentosFiltrados.length);
        } else {
          console.log('API retornou success: false');
          this.agendamentos = [];
          this.agendamentosAtivos = [];
          this.agendamentosConcluidos = [];
        }
      },
      error: (err) => {
        console.error('Erro ao carregar agendamentos:', err);
        this.loading = false;
        console.log('Loading set to false devido ao erro');

        // Fallback com dados simulados
        this.agendamentos = [];
        this.agendamentosAtivos = [];
        this.agendamentosConcluidos = [];
        console.log('Arrays resetados devido ao erro');
      }
    });
  }

  separarAgendamentos() {
    console.log('=== SEPARANDO AGENDAMENTOS ===');
    console.log('Agendamentos para separar:', this.agendamentos.length);

    // Obter data atual no formato YYYY-MM-DD sem problemas de fuso horário
    const hoje = new Date();
    const hojeStr = hoje.getFullYear() + '-' +
                   String(hoje.getMonth() + 1).padStart(2, '0') + '-' +
                   String(hoje.getDate()).padStart(2, '0');

    console.log('Data atual para separação:', hojeStr);

    // Marcar localmente agendamentos pendentes com data passada como expirados
    this.agendamentos.forEach(ag => {
      if (ag.status === 'pendente' && ag.data < hojeStr) {
        console.log(`Marcando agendamento ${ag.id} como expirado (data: ${ag.data})`);
        ag.status = 'expirado';
      }
    });

    this.agendamentosAtivos = this.agendamentos.filter((ag: any) => {
      // Agendamentos ativos: pendentes, confirmados com data futura ou hoje
      const statusAtivo = ag.status === 'pendente' || ag.status === 'confirmado';
      const dataFuturaOuHoje = ag.data >= hojeStr;
      return statusAtivo && dataFuturaOuHoje;
    });

    console.log('Agendamentos ativos encontrados:', this.agendamentosAtivos.length);

    this.agendamentosConcluidos = this.agendamentos.filter((ag: any) => {
      // Agendamentos concluídos: rejeitados, cancelados, faltou, expirados ou passados
      const statusConcluido = ag.status === 'rejeitado' || ag.status === 'cancelado' || ag.status === 'faltou' || ag.status === 'expirado';
      const dataPassada = ag.data < hojeStr;
      return statusConcluido || dataPassada;
    });

    console.log('Agendamentos concluídos encontrados:', this.agendamentosConcluidos.length);

    // Atualizar agendamentos expirados no backend (assíncrono, não bloqueia a UI)
    this.atualizarAgendamentosExpirados();
  }

  filtrarAgendamentos() {
    console.log('=== FILTRANDO AGENDAMENTOS ===');
    console.log('Segmento selecionado:', this.selectedSegment);
    console.log('Agendamentos ativos disponíveis:', this.agendamentosAtivos.length);
    console.log('Agendamentos totais disponíveis:', this.agendamentos.length);

    let agendamentosFiltrados: any[] = [];

    if (this.selectedSegment === 'todos') {
      // Na tela principal, mostrar apenas agendamentos ativos
      agendamentosFiltrados = [...this.agendamentosAtivos];
      console.log('Filtro "todos" aplicado - agendamentos ativos:', agendamentosFiltrados.length);
    } else {
      // Para filtros específicos, usar todos os agendamentos
      agendamentosFiltrados = this.agendamentos.filter((ag: any) => {
        return ag.status === this.selectedSegment;
      });
      console.log(`Filtro "${this.selectedSegment}" aplicado:`, agendamentosFiltrados.length);
    }

    // Ordenar agendamentos: pendentes primeiro, depois aprovados, depois por data
    this.agendamentosFiltrados = agendamentosFiltrados.sort((a, b) => {
      // Prioridade por status: pendente > confirmado > outros
      const statusPriority = (status: string) => {
        switch (status) {
          case 'pendente': return 1;
          case 'confirmado': return 2;
          default: return 3;
        }
      };

      const aPriority = statusPriority(a.status);
      const bPriority = statusPriority(b.status);

      // Se as prioridades são diferentes, ordenar por prioridade
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Se as prioridades são iguais, ordenar por data (mais recente primeiro)
      const aDateTime = new Date(a.data + ' ' + a.hora).getTime();
      const bDateTime = new Date(b.data + ' ' + b.hora).getTime();
      return bDateTime - aDateTime;
    });

    console.log('Agendamentos filtrados finais:', this.agendamentosFiltrados.length);
    console.log('Agendamentos filtrados:', this.agendamentosFiltrados);
  }

  onSegmentChange() {
    this.filtrarAgendamentos();
  }

  abrirHistorico() {
    // Incluir todos os agendamentos no histórico (ativos e concluídos)
    this.historicoAgendamentos = [...this.agendamentos].sort((a, b) => {
      // Ordenar por data (mais recente primeiro)
      return new Date(b.data + ' ' + b.hora).getTime() - new Date(a.data + ' ' + a.hora).getTime();
    });
    this.showHistoryModal = true;
  }

  fecharHistorico() {
    this.showHistoryModal = false;
  }

  verDetalhes(agendamento: any) {
    this.selectedAgendamento = agendamento;
    this.showDetails = true;
  }

  fecharDetalhes() {
    this.showDetails = false;
    this.selectedAgendamento = null;
  }

  async cancelarAgendamento(agendamento: any) {
    const confirmed = await this.showConfirmAlert(
      'Cancelar Agendamento',
      'Deseja realmente cancelar este agendamento?',
      'Sim, cancelar',
      'Não'
    );
    if (confirmed) {
      this.api.cancelarAgendamento(agendamento.id).subscribe({
        next: (res) => {
          if (res.success) {
            this.showSuccessAlert('Agendamento cancelado com sucesso!');
            this.carregarAgendamentos();
          }
        },
        error: (err) => {
          console.error('Erro ao cancelar agendamento:', err);
          this.showErrorAlert('Erro ao cancelar agendamento');
        }
      });
    }
  }

  verProcedimento() {
    // Mapear nome do procedimento para ID da rota
    const procedimentoMap: { [key: string]: string } = {
      'Volume Brasileiro': 'volume-brasileiro',
      'Volume Inglês': 'volume-ingles',
      'Fox Eyes - Raposinha': 'fox-eyes',
      'Fox Eyes': 'fox-eyes',
      'Hidragloss - Lips': 'hidragloss',
      'Hidragloss': 'hidragloss',
      'Lash Lifting': 'lash-lifting'
    };

    const procedimentoId = procedimentoMap[this.selectedAgendamento?.procedimento_nome] || 'volume-brasileiro';
    this.router.navigateByUrl(`/procedimento-detalhes/${procedimentoId}`);
    this.fecharDetalhes();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'confirmado': return 'success';
      case 'pendente': return 'warning';
      case 'cancelado': return 'danger';
      case 'rejeitado': return 'danger';
      case 'faltou': return 'danger';
      case 'expirado': return 'dark';
      default: return 'medium';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'confirmado': return 'Confirmado';
      case 'pendente': return 'Pendente';
      case 'cancelado': return 'Cancelado';
      case 'rejeitado': return 'Rejeitado';
      case 'faltou': return 'Faltou';
      case 'expirado': return 'Expirado';
      default: return status;
    }
  }

  formatarData(data: string): string {
    try {
      if (!data) return '';
      // Garantir que a data seja interpretada como local, não UTC
      const [year, month, day] = data.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return data || '';
    }
  }

  formatarHora(hora: string): string {
    try {
      if (!hora) return '';
      return hora.substring(0, 5);
    } catch (error) {
      console.error('Erro ao formatar hora:', error);
      return hora || '';
    }
  }

  irParaCursos() {
    this.router.navigateByUrl('/cursos');
  }

  // Métodos para verificar roles
  isAdmin(): boolean {
    try {
      return this.authService?.currentUser?.role === 'admin';
    } catch (error) {
      console.error('Erro ao verificar se é admin:', error);
      return false;
    }
  }

  isProfissional(): boolean {
    try {
      return this.authService?.currentUser?.role === 'profissional';
    } catch (error) {
      console.error('Erro ao verificar se é profissional:', error);
      return false;
    }
  }

  canManageAppointments(): boolean {
    try {
      return this.isAdmin() || this.isProfissional();
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      return false;
    }
  }

  // Métodos para aprovação/rejeição
  abrirModalAprovacao(agendamento: any) {
    this.selectedAgendamentoForAction = agendamento;
    this.approvalMessage = '';
    this.showApprovalModal = true;
  }

  abrirModalRejeicao(agendamento: any) {
    this.selectedAgendamentoForAction = agendamento;
    this.rejectionMessage = '';
    this.showRejectionModal = true;
  }

  fecharModais() {
    this.showApprovalModal = false;
    this.showRejectionModal = false;
    this.selectedAgendamentoForAction = null;
    this.approvalMessage = '';
    this.rejectionMessage = '';
  }

  aprovarAgendamento() {
    if (!this.selectedAgendamentoForAction) return;

    this.isProcessing = true;
    const agendamentoId = this.selectedAgendamentoForAction.id;
    const dados = {
      status: 'confirmado',
      mensagem: this.approvalMessage || undefined
    };

    this.api.updateAgendamentoStatus(agendamentoId, dados).subscribe({
      next: (res) => {
        this.isProcessing = false;
        if (res.success) {
          // Atualizar o agendamento na lista
          const index = this.agendamentos.findIndex(a => a.id === agendamentoId);
          if (index !== -1) {
            this.agendamentos[index].status = 'confirmado';
            this.agendamentos[index].mensagem_aprovacao = this.approvalMessage;
          }
          this.filtrarAgendamentos();
          this.fecharModais();
          console.log('Agendamento aprovado com sucesso');
        } else {
          console.error('Erro ao aprovar agendamento:', res.message);
        }
      },
      error: (err) => {
        this.isProcessing = false;
        console.error('Erro ao aprovar agendamento:', err);
      }
    });
  }

  rejeitarAgendamento() {
    if (!this.selectedAgendamentoForAction) return;

    this.isProcessing = true;
    const agendamentoId = this.selectedAgendamentoForAction.id;
    const dados = {
      status: 'rejeitado',
      mensagem: this.rejectionMessage || undefined
    };

    this.api.updateAgendamentoStatus(agendamentoId, dados).subscribe({
      next: (res) => {
        this.isProcessing = false;
        if (res.success) {
          // Atualizar o agendamento na lista
          const index = this.agendamentos.findIndex(a => a.id === agendamentoId);
          if (index !== -1) {
            this.agendamentos[index].status = 'rejeitado';
            this.agendamentos[index].motivo_rejeicao = this.rejectionMessage;
          }
          this.filtrarAgendamentos();
          this.fecharModais();
          console.log('Agendamento rejeitado com sucesso');
        } else {
          console.error('Erro ao rejeitar agendamento:', res.message);
        }
      },
      error: (err) => {
        this.isProcessing = false;
        console.error('Erro ao rejeitar agendamento:', err);
      }
    });
  }

  atualizarAgendamentosExpirados() {
    this.api.atualizarAgendamentosExpirados().subscribe({
      next: (res) => {
        if (res.success && res.count > 0) {
          console.log(`${res.count} agendamentos expirados atualizados no backend`);
        }
      },
      error: (err) => {
        console.error('Erro ao atualizar agendamentos expirados:', err);
        // Mesmo com erro, continuar com a lógica local
      }
    });
  }

  private getTodayString(): string {
    const hoje = new Date();
    return hoje.getFullYear() + '-' +
           String(hoje.getMonth() + 1).padStart(2, '0') + '-' +
           String(hoje.getDate()).padStart(2, '0');
  }

}
