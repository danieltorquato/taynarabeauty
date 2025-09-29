import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonCard, IonCardHeader, IonCardContent, IonButton, IonChip, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons, IonIcon } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { addIcons } from 'ionicons';
import { calendarOutline, timeOutline, personOutline, checkmarkCircleOutline, closeCircleOutline, informationCircleOutline, schoolOutline } from 'ionicons/icons';

@Component({
  selector: 'app-meus-agendamentos',
  templateUrl: './meus-agendamentos.page.html',
  styleUrls: ['./meus-agendamentos.page.scss'],
  standalone: true,
  imports: [IonIcon, IonButtons, IonBackButton, IonTitle, IonToolbar, IonHeader, IonChip, IonButton, IonCardContent, IonCardHeader, IonCard, IonContent, CommonModule, FormsModule]
})
export class MeusAgendamentosPage implements OnInit {
  agendamentos: any[] = [];
  loading = false;
  selectedAgendamento: any = null;
  showDetails = false;

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private router: Router
  ) {
    addIcons({calendarOutline, timeOutline, personOutline, checkmarkCircleOutline, closeCircleOutline, informationCircleOutline, schoolOutline});
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
          this.agendamentos = res.agendamentos || [];
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
      default: return 'medium';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'confirmado': return 'Confirmado';
      case 'pendente': return 'Pendente';
      case 'cancelado': return 'Cancelado';
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
