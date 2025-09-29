import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonCard, IonCardHeader, IonCardContent, IonButton, IonChip, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons, IonLabel, IonSelect, IonSelectOption, IonDatetime, IonIcon } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { addIcons } from 'ionicons';
import { calendarOutline, timeOutline, personOutline, checkmarkCircleOutline, closeCircleOutline, informationCircleOutline, refreshOutline, filterOutline } from 'ionicons/icons';

@Component({
  selector: 'app-agendamentos-admin',
  templateUrl: './agendamentos-admin.page.html',
  styleUrls: ['./agendamentos-admin.page.scss'],
  standalone: true,
  imports: [IonIcon, IonDatetime, IonSelectOption, IonSelect, IonLabel, IonButtons, IonBackButton, IonTitle, IonToolbar, IonHeader, IonChip, IonButton, IonCardContent, IonCardHeader, IonCard, IonContent, CommonModule, FormsModule]
})
export class AgendamentosAdminPage implements OnInit {
  agendamentos: any[] = [];
  profissionais: any[] = [];
  loading = false;
  selectedDate = new Date().toISOString().split('T')[0];
  selectedProfissional = 'todos';
  selectedAgendamento: any = null;
  showDetails = false;
  maxDate = new Date().toISOString().split('T')[0];

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private router: Router
  ) {
    addIcons({calendarOutline, timeOutline, personOutline, checkmarkCircleOutline, closeCircleOutline, informationCircleOutline, refreshOutline, filterOutline});
  }

  ngOnInit() {
    this.carregarProfissionais();
    this.carregarAgendamentos();
  }

  carregarProfissionais() {
    this.api.getProfissionais().subscribe({
      next: (res) => {
        if (res.success) {
          this.profissionais = res.profissionais;
        }
      },
      error: (err) => {
        console.error('Erro ao carregar profissionais:', err);
      }
    });
  }

  carregarAgendamentos() {
    this.loading = true;
    this.api.getAdminAgendamentos(this.selectedDate).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          let agendamentos = res.agendamentos || [];

          // Filtrar por profissional se selecionado
          if (this.selectedProfissional !== 'todos') {
            agendamentos = agendamentos.filter((ag: any) =>
              ag.profissional_id == this.selectedProfissional
            );
          }

          this.agendamentos = agendamentos;
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Erro ao carregar agendamentos:', err);
      }
    });
  }

  onDateChange() {
    this.carregarAgendamentos();
  }

  onProfissionalChange() {
    this.carregarAgendamentos();
  }

  verDetalhes(agendamento: any) {
    this.selectedAgendamento = agendamento;
    this.showDetails = true;
  }

  fecharDetalhes() {
    this.showDetails = false;
    this.selectedAgendamento = null;
  }

  aprovarAgendamento(agendamento: any) {
    if (confirm('Deseja aprovar este agendamento?')) {
      this.api.aprovarAgendamento(agendamento.id).subscribe({
        next: (res) => {
          if (res.success) {
            alert('Agendamento aprovado com sucesso!');
            this.carregarAgendamentos();
          }
        },
        error: (err) => {
          console.error('Erro ao aprovar agendamento:', err);
          alert('Erro ao aprovar agendamento');
        }
      });
    }
  }

  rejeitarAgendamento(agendamento: any) {
    if (confirm('Deseja realmente rejeitar este agendamento? Esta ação não pode ser desfeita.')) {
      this.api.rejeitarAgendamento(agendamento.id).subscribe({
        next: (res) => {
          if (res.success) {
            alert('Agendamento rejeitado. Os horários foram liberados.');
            this.carregarAgendamentos();
          }
        },
        error: (err) => {
          console.error('Erro ao rejeitar agendamento:', err);
          alert('Erro ao rejeitar agendamento');
        }
      });
    }
  }

  marcarFalta(agendamento: any) {
    if (confirm('Confirma que o cliente faltou a este agendamento?')) {
      this.api.marcarFaltaAgendamento(agendamento.id).subscribe({
        next: (res) => {
          if (res.success) {
            alert('Falta registrada. Os horários foram liberados.');
            this.carregarAgendamentos();
          }
        },
        error: (err) => {
          console.error('Erro ao marcar falta:', err);
          alert('Erro ao marcar falta');
        }
      });
    }
  }

  cancelarAgendamento(agendamento: any) {
    if (confirm('Deseja cancelar este agendamento? Os horários serão liberados.')) {
      this.api.cancelarAgendamentoAdmin(agendamento.id).subscribe({
        next: (res) => {
          if (res.success) {
            alert('Agendamento cancelado. Os horários foram liberados.');
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

  getProfissionalNome(profissionalId: number): string {
    if (!profissionalId) return 'Não informado';
    const prof = this.profissionais.find(p => String(p.id) === String(profissionalId));
    return prof ? prof.nome : `ID ${profissionalId}`;
  }
}
