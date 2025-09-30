import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonCard, IonCardHeader, IonCardContent, IonButton, IonChip, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons, IonLabel, IonSelect, IonSelectOption, IonDatetime, IonIcon, IonSegmentButton, IonSegment, IonModal, IonTextarea, IonItem } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { addIcons } from 'ionicons';
import { calendarOutline, timeOutline, personOutline, checkmarkCircleOutline, closeCircleOutline, informationCircleOutline, refreshOutline, filterOutline, addOutline, removeCircleOutline, closeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-agendamentos-admin',
  templateUrl: './agendamentos-admin.page.html',
  styleUrls: ['./agendamentos-admin.page.scss'],
  standalone: true,
  imports: [IonSegmentButton, IonIcon, IonDatetime, IonSelectOption, IonSelect, IonLabel, IonButtons, IonBackButton, IonTitle, IonToolbar, IonHeader, IonChip, IonButton, IonCardContent, IonCardHeader, IonCard, IonContent, IonSegment, IonSegmentButton, IonModal, IonTextarea, IonItem, CommonModule, FormsModule]
})
export class AgendamentosAdminPage implements OnInit {
  agendamentos: any[] = [];
  agendamentosFiltrados: any[] = [];
  profissionais: any[] = [];
  loading = false;
  selectedDate = new Date().toISOString().split('T')[0];
  selectedProfissional = 'todos';
  selectedSegment = 'todos';
  selectedAgendamento: any = null;
  showDetails = false;
  showUnmarkModal = false;
  unmarkJustification = '';
  maxDate = new Date().toISOString().split('T')[0];

  // Funcionalidades de agendamento
  showAgendamentoForm = false;
  procedimentos: any[] = [];
  horariosDisponiveis: string[] = [];
  selectedProcedimento: number = 0;
  selectedTime: string = '';
  clienteNome: string = '';
  clienteTelefone: string = '';
  observacoes: string = '';
  // Removido minDate para permitir dias anteriores

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private router: Router
  ) {
    addIcons({refreshOutline,addOutline,timeOutline,calendarOutline,personOutline,informationCircleOutline,checkmarkCircleOutline,closeCircleOutline,removeCircleOutline,closeOutline,filterOutline});
  }

  ngOnInit() {
    this.carregarProfissionais();
    this.carregarAgendamentos();
    this.carregarProcedimentos();
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
          this.filtrarAgendamentos();
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Erro ao carregar agendamentos:', err);
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

  onDateChange() {
    // Garantir que a data seja processada corretamente sem problemas de fuso horário
    this.selectedDate = this.normalizeDate(this.selectedDate);
    this.carregarAgendamentos();
  }

  onDateChangeEvent(event: any) {
    // Método alternativo para capturar mudanças de data
    if (event.detail && event.detail.value) {
      this.selectedDate = this.normalizeDate(event.detail.value);
      this.carregarAgendamentos();
    }
  }

  private normalizeDate(dateString: string): string {
    if (!dateString) return '';

    try {
      // Se a data vem como string ISO, extrair apenas a parte da data
      if (dateString.includes('T')) {
        dateString = dateString.split('T')[0];
      }

      // Verificar se já está no formato correto YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }

      // Se não estiver no formato correto, tentar converter
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }

      // Usar métodos de data para evitar problemas de fuso horário
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      return dateString;
    }
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
    const motivo = prompt('Digite o motivo da rejeição (opcional):');
    if (motivo !== null) { // Usuário não cancelou
      this.api.rejeitarAgendamento(agendamento.id, motivo).subscribe({
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

  abrirModalDesmarcar(agendamento: any) {
    this.selectedAgendamento = agendamento;
    this.unmarkJustification = '';
    this.showUnmarkModal = true;
  }

  fecharModalDesmarcar() {
    this.showUnmarkModal = false;
    this.unmarkJustification = '';
    this.selectedAgendamento = null;
  }

  desmarcarAgendamento() {
    if (!this.unmarkJustification.trim()) {
      alert('Por favor, informe a justificativa para desmarcar o agendamento.');
      return;
    }

    this.api.desmarcarAgendamento(this.selectedAgendamento.id, this.unmarkJustification).subscribe({
      next: (res) => {
        if (res.success) {
          this.carregarAgendamentos();
          this.fecharModalDesmarcar();
          alert('Agendamento desmarcado com sucesso!');
        } else {
          alert('Erro ao desmarcar agendamento: ' + res.message);
        }
      },
      error: (err) => {
        console.error('Erro ao desmarcar agendamento:', err);
        alert('Erro ao desmarcar agendamento');
      }
    });
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

  getProfissionalNome(profissionalId: number): string {
    if (!profissionalId) return 'Não informado';
    const prof = this.profissionais.find(p => String(p.id) === String(profissionalId));
    return prof ? prof.nome : `ID ${profissionalId}`;
  }

  carregarProcedimentos() {
    this.api.getProcedimentos().subscribe({
      next: (res) => {
        if (res.success) {
          this.procedimentos = res.procedimentos;
        }
      },
      error: (err) => {
        console.error('Erro ao carregar procedimentos:', err);
      }
    });
  }

  abrirFormularioAgendamento() {
    this.showAgendamentoForm = true;
    this.resetFormularioAgendamento();
  }

  fecharFormularioAgendamento() {
    this.showAgendamentoForm = false;
    this.resetFormularioAgendamento();
  }

  resetFormularioAgendamento() {
    this.selectedProcedimento = 0;
    this.selectedTime = '';
    this.clienteNome = '';
    this.clienteTelefone = '';
    this.observacoes = '';
    this.horariosDisponiveis = [];
  }

  onDateChangeAgendamento() {
    // Garantir que a data seja processada corretamente sem problemas de fuso horário
    this.selectedDate = this.normalizeDate(this.selectedDate);
    console.log('📅 Data normalizada (agendamento):', this.selectedDate);

    if (this.selectedDate && this.selectedProcedimento) {
      this.carregarHorariosDisponiveis();
    }
  }

  onProcedimentoChange() {
    if (this.selectedDate && this.selectedProcedimento) {
      this.carregarHorariosDisponiveis();
    }
  }

  carregarHorariosDisponiveis() {
    if (!this.selectedDate || !this.selectedProcedimento) return;

    this.api.getHorarios(this.selectedDate, 0, this.selectedProcedimento).subscribe({
      next: (res) => {
        if (res.success) {
          this.horariosDisponiveis = res.horarios.map((h: any) => h.hora.substring(0, 5));
        } else {
          this.horariosDisponiveis = [];
        }
      },
      error: (err) => {
        console.error('Erro ao carregar horários:', err);
        this.horariosDisponiveis = [];
      }
    });
  }

  criarAgendamentoAdmin() {
    if (!this.selectedProcedimento || !this.selectedDate || !this.selectedTime || !this.clienteNome) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    const payload = {
      procedimento_id: this.selectedProcedimento,
      profissional_id: 0, // Sem preferência
      data: this.selectedDate,
      hora: this.selectedTime,
      observacoes: this.observacoes,
      cliente_nome: this.clienteNome,
      cliente_telefone: this.clienteTelefone
    };

    this.api.createAppointment(payload).subscribe({
      next: (res) => {
        if (res.success) {
          alert('Agendamento criado com sucesso!');
          this.fecharFormularioAgendamento();
          this.carregarAgendamentos();
        } else {
          alert(res.message || 'Erro ao criar agendamento.');
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Erro ao criar agendamento.');
      }
    });
  }
}
