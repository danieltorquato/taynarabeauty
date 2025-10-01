import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonCard, IonCardHeader, IonCardContent, IonButton, IonChip, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons, IonIcon, IonSegmentButton, IonSegment, IonLabel, IonModal, IonList } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { addIcons } from 'ionicons';
import { calendarOutline, timeOutline, personOutline, checkmarkCircleOutline, closeCircleOutline, informationCircleOutline, schoolOutline, closeOutline, alertCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-meus-agendamentos',
  templateUrl: './meus-agendamentos.page.html',
  styleUrls: ['./meus-agendamentos.page.scss'],
  standalone: true,
  imports: [IonLabel, IonSegmentButton, IonIcon, IonButtons, IonBackButton, IonTitle, IonToolbar, IonHeader, IonChip, IonButton, IonCardContent, IonCardHeader, IonCard, IonContent, IonSegment, IonSegmentButton, IonLabel, IonModal, IonList, CommonModule, FormsModule]
})
export class MeusAgendamentosPage implements OnInit {
  agendamentos: any[] = [];
  agendamentosFiltrados: any[] = [];
  loading = false;
  selectedAgendamento: any = null;
  showDetails = false;
  selectedSegment = 'todos';
  showHistoryModal = false;
  historicoAgendamentos: any[] = [];

  constructor(
    public authService: AuthService,
    private api: ApiService,
    private router: Router
  ) {
    addIcons({timeOutline,calendarOutline,personOutline,informationCircleOutline,closeCircleOutline,closeOutline,alertCircleOutline,checkmarkCircleOutline,schoolOutline});
  }

  ngOnInit() {
    this.carregarAgendamentos();
  }

  carregarAgendamentos() {
    this.loading = true;
    this.api.getMeusAgendamentos().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          let agendamentos = res.agendamentos || [];

          // Filtrar agendamentos baseado no role do usuário
          const currentUser = this.authService.currentUser;
          if (currentUser) {
            if (currentUser.role === 'admin' || currentUser.role === 'recepcao') {
              // Admin e recepção veem todos os agendamentos
              this.agendamentos = agendamentos;
            } else if (currentUser.role === 'profissional') {
              // Profissional vê apenas agendamentos onde ele é responsável
              this.agendamentos = agendamentos.filter((ag: any) =>
                ag.profissional_id === currentUser.id || ag.profissional_id == currentUser.id
              );
            } else {
              // Cliente vê apenas seus próprios agendamentos
              this.agendamentos = agendamentos;
            }
          } else {
            this.agendamentos = agendamentos;
          }
          this.filtrarAgendamentos();
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Erro ao carregar agendamentos:', err);
        // Fallback com dados simulados
        this.agendamentos = [];
      }
    });
  }

  filtrarAgendamentos() {
    if (this.selectedSegment === 'todos') {
      this.agendamentosFiltrados = this.agendamentos;
    } else {
      this.agendamentosFiltrados = this.agendamentos.filter((ag: any) =>
        ag.status === this.selectedSegment
      );
    }
  }

  onSegmentChange() {
    this.filtrarAgendamentos();
  }

  abrirHistorico() {
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


  getStatusColor(status: string): string {
    switch (status) {
      case 'confirmado': return 'success';
      case 'pendente': return 'warning';
      case 'cancelado': return 'danger';
      case 'rejeitado': return 'danger';
      case 'faltou': return 'danger';
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
      default: return status;
    }
  }

  formatarData(data: string): string {
    if (!data) return '';

    try {
      // Se a data já está no formato YYYY-MM-DD, usar diretamente
      if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        const [year, month, day] = data.split('-');
        return `${day}/${month}/${year}`;
      }

      // Se não, tentar converter sem problemas de fuso horário
      const date = new Date(data + 'T00:00:00');
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return data;
    }
  }

  formatarHora(hora: string): string {
    return hora.substring(0, 5);
  }

  irParaCursos() {
    this.router.navigateByUrl('/cursos');
  }

  verProcedimento() {
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

  // Verificar se o usuário é profissional
  isProfissional(): boolean {
    const currentUser = this.authService.currentUser;
    return currentUser?.role === 'profissional' || currentUser?.role === 'admin';
  }

  // Aprovar agendamento
  aprovarAgendamento(agendamento: any) {
    if (confirm('Deseja aprovar este agendamento?')) {
      this.api.aprovarAgendamento(agendamento.id).subscribe({
        next: (res) => {
          if (res.success) {
            alert('Agendamento aprovado com sucesso!');
            this.carregarAgendamentos();
            this.fecharDetalhes();
          } else {
            alert('Erro ao aprovar agendamento: ' + res.message);
          }
        },
        error: (err) => {
          console.error('Erro ao aprovar agendamento:', err);
          alert('Erro ao aprovar agendamento');
        }
      });
    }
  }

  // Rejeitar agendamento
  rejeitarAgendamento(agendamento: any) {
    const motivo = prompt('Digite o motivo da rejeição (opcional):');
    if (motivo !== null) { // Usuário não cancelou
      this.api.rejeitarAgendamento(agendamento.id, motivo).subscribe({
        next: (res) => {
          if (res.success) {
            alert('Agendamento rejeitado. Os horários foram liberados.');
            this.carregarAgendamentos();
            this.fecharDetalhes();
          } else {
            alert('Erro ao rejeitar agendamento: ' + res.message);
          }
        },
        error: (err) => {
          console.error('Erro ao rejeitar agendamento:', err);
          alert('Erro ao rejeitar agendamento');
        }
      });
    }
  }

  // Cancelar agendamento
  cancelarAgendamento(agendamento: any) {
    if (confirm('Deseja cancelar este agendamento? Os horários serão liberados.')) {
      this.api.cancelarAgendamentoAdmin(agendamento.id).subscribe({
        next: (res) => {
          if (res.success) {
            alert('Agendamento cancelado. Os horários foram liberados.');
            this.carregarAgendamentos();
            this.fecharDetalhes();
          } else {
            alert('Erro ao cancelar agendamento: ' + res.message);
          }
        },
        error: (err) => {
          console.error('Erro ao cancelar agendamento:', err);
          alert('Erro ao cancelar agendamento');
        }
      });
    }
  }
}
