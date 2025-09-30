import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonCard, IonCardHeader, IonCardContent, IonButton, IonChip, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons, IonIcon, IonSegmentButton, IonSegment, IonLabel, IonModal, IonList, IonItem } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { addIcons } from 'ionicons';
import { calendarOutline, timeOutline, personOutline, checkmarkCircleOutline, closeCircleOutline, informationCircleOutline, schoolOutline, closeOutline, alertCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-meus-agendamentos',
  templateUrl: './meus-agendamentos.page.html',
  styleUrls: ['./meus-agendamentos.page.scss'],
  standalone: true,
  imports: [IonLabel, IonSegmentButton, IonIcon, IonButtons, IonBackButton, IonTitle, IonToolbar, IonHeader, IonChip, IonButton, IonCardContent, IonCardHeader, IonCard, IonContent, IonSegment, IonSegmentButton, IonLabel, IonModal, IonList, IonItem, CommonModule, FormsModule]
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

  cancelarAgendamento(agendamento: any) {
    if (confirm('Deseja realmente cancelar este agendamento?')) {
      this.api.cancelarAgendamento(agendamento.id).subscribe({
        next: (res) => {
          if (res.success) {
            alert('Agendamento cancelado com sucesso!');
            this.carregarAgendamentos();
          }
        },
        error: (err) => {
          console.error('Erro ao cancelar agendamento:', err);
          alert('Erro ao cancelar agendamento');
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
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR');
  }

  formatarHora(hora: string): string {
    return hora.substring(0, 5);
  }

  irParaCursos() {
    this.router.navigateByUrl('/cursos');
  }
}
