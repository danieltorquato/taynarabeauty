import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonItem, IonLabel, IonInput, IonList, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { ApiService } from '../../services/api.service';

interface TimeSlot {
  time: string;
  status: 'livre' | 'bloqueado' | 'ocupado';
  originalStatus: 'livre' | 'bloqueado' | 'ocupado';
  cliente?: string;
  agendamento_id?: number;
  hasChanges?: boolean;
}

@Component({
  selector: 'app-dashboard-admin',
  templateUrl: './dashboard-admin.page.html',
  styleUrls: ['./dashboard-admin.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonItem, IonLabel, IonInput, IonList, IonSelect, IonSelectOption, CommonModule, FormsModule]
})
export class DashboardAdminPage implements OnInit {
  selectedDate = new Date().toISOString().split('T')[0];
  agendamentosData: any[] = [];
  timeSlots: TimeSlot[] = [];
  hasUnsavedChanges = false;
  pendingChanges: Array<{time: string, status: 'livre' | 'bloqueado'}> = [];

  // Novas propriedades para liberação específica
  profissionais: any[] = [];
  procedimentos: any[] = [];
  procedimentosFiltrados: any[] = [];
  selectedProfissional = '0';
  selectedProcedimento = '0';
  horarioInicial = '08:00';
  horarioFinal = '18:00';

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.generateTimeSlots();
    this.loadAgendamentos();
    this.loadProfissionais();
    this.loadProcedimentos();
  }

  generateTimeSlots() {
    this.timeSlots = [];
    // Gerar horários de 8:00 às 18:00 de 15 em 15 minutos
    let currentTime = new Date();
    currentTime.setHours(8, 0, 0, 0);
    const endTime = new Date();
    endTime.setHours(18, 0, 0, 0);

    while (currentTime <= endTime) {
      const timeString = currentTime.toTimeString().substring(0, 5);
      this.timeSlots.push({
        time: timeString,
        status: 'bloqueado', // Por padrão, bloqueado até ser liberado
        originalStatus: 'bloqueado',
        hasChanges: false
      });
      currentTime.setMinutes(currentTime.getMinutes() + 15);
    }
  }

  loadAgendamentos() {
    this.api.getAdminAgendamentos(this.selectedDate).subscribe({
      next: (res) => {
        if (res.success) {
          this.agendamentosData = res.agendamentos;
          this.updateTimeSlotStatus();
        }
      },
      error: (err) => {
        console.error('Erro ao carregar agendamentos:', err);
      }
    });
  }

  updateTimeSlotStatus() {
    // Reset all slots to blocked
    this.timeSlots.forEach(slot => {
      slot.status = 'bloqueado';
      slot.originalStatus = 'bloqueado';
      slot.cliente = undefined;
      slot.agendamento_id = undefined;
      slot.hasChanges = false;
    });

    // Load available times from backend
    this.api.getHorarios(this.selectedDate).subscribe({
      next: (res) => {
        if (res.success) {
          res.horarios.forEach((horario: any) => {
            const timeString = horario.hora.substring(0, 5);
            const slot = this.timeSlots.find(s => s.time === timeString);
            if (slot) {
              slot.status = 'livre';
              slot.originalStatus = 'livre';
            }
          });
        }

        // Mark booked slots
        this.agendamentosData.forEach(agendamento => {
          const timeString = agendamento.hora.substring(0, 5);
          const slot = this.timeSlots.find(s => s.time === timeString);
          if (slot) {
            slot.status = 'ocupado';
            slot.originalStatus = 'ocupado';
            slot.cliente = agendamento.cliente_nome;
            slot.agendamento_id = agendamento.id;
          }
        });
      },
      error: (err) => {
        console.error('Erro ao carregar horários:', err);
      }
    });
  }

  onDateChange() {
    if (this.hasUnsavedChanges) {
      const confirmChange = confirm('Você tem alterações não salvas. Deseja continuar e perder as alterações?');
      if (!confirmChange) {
        return;
      }
    }
    this.clearPendingChanges();
    this.loadAgendamentos();
  }

  toggleTimeSlot(slot: TimeSlot) {
    if (slot.originalStatus === 'ocupado') {
      alert('Este horário já está ocupado com um agendamento e não pode ser alterado.');
      return;
    }

    // Toggle entre livre e bloqueado
    const newStatus = slot.status === 'livre' ? 'bloqueado' : 'livre';
    slot.status = newStatus;
    slot.hasChanges = slot.status !== slot.originalStatus;

    this.updatePendingChanges();
  }

  liberarTodosHorarios() {
    this.timeSlots.forEach(slot => {
      if (slot.originalStatus !== 'ocupado') {
        slot.status = 'livre';
        slot.hasChanges = slot.status !== slot.originalStatus;
      }
    });
    this.updatePendingChanges();
  }

  bloquearTodosHorarios() {
    this.timeSlots.forEach(slot => {
      if (slot.originalStatus !== 'ocupado') {
        slot.status = 'bloqueado';
        slot.hasChanges = slot.status !== slot.originalStatus;
      }
    });
    this.updatePendingChanges();
  }

  updatePendingChanges() {
    this.pendingChanges = [];
    this.timeSlots.forEach(slot => {
      if (slot.hasChanges && slot.originalStatus !== 'ocupado') {
        this.pendingChanges.push({
          time: slot.time,
          status: slot.status as 'livre' | 'bloqueado'
        });
      }
    });
    this.hasUnsavedChanges = this.pendingChanges.length > 0;
  }

  clearPendingChanges() {
    this.pendingChanges = [];
    this.hasUnsavedChanges = false;
    this.timeSlots.forEach(slot => {
      slot.hasChanges = false;
    });
  }

  salvarAlteracoes() {
    if (this.pendingChanges.length === 0) {
      alert('Nenhuma alteração para salvar.');
      return;
    }

    const batchData = {
      data: this.selectedDate,
      alteracoes: this.pendingChanges
    };

    this.api.salvarHorariosBatch(batchData).subscribe({
      next: (res) => {
        if (res.success) {
          alert('Alterações salvas com sucesso!');
          this.clearPendingChanges();
          this.loadAgendamentos(); // Recarrega para sincronizar com o banco
        } else {
          alert(res.message || 'Erro ao salvar alterações');
        }
      },
      error: (err) => {
        alert('Erro ao comunicar com o servidor');
        console.error('Erro ao salvar:', err);
      }
    });
  }

  descartarAlteracoes() {
    if (!this.hasUnsavedChanges) return;

    const confirmDiscard = confirm('Tem certeza que deseja descartar todas as alterações?');
    if (confirmDiscard) {
      this.timeSlots.forEach(slot => {
        slot.status = slot.originalStatus;
        slot.hasChanges = false;
      });
      this.clearPendingChanges();
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'livre': return 'Livre';
      case 'bloqueado': return 'Bloqueado';
      case 'ocupado': return 'Ocupado';
      default: return 'Desconhecido';
    }
  }

  // Novos métodos para liberação específica
  loadProfissionais() {
    this.api.getProfissionais().subscribe({
      next: (res) => {
        if (res.success) {
          this.profissionais = res.profissionais;
          console.log('Profissionais carregados:', this.profissionais);
          // Inicializar com todos os procedimentos
          this.procedimentosFiltrados = [...this.procedimentos];
        }
      },
      error: (err) => {
        console.error('Erro ao carregar profissionais:', err);
      }
    });
  }

  loadProcedimentos() {
    this.api.getProcedimentos().subscribe({
      next: (res) => {
        if (res.success) {
          this.procedimentos = res.procedimentos;
          // Inicializar com todos os procedimentos
          this.procedimentosFiltrados = [...this.procedimentos];
        }
      },
      error: (err) => {
        console.error('Erro ao carregar procedimentos:', err);
      }
    });
  }

  onProfissionalChange() {
    this.filtrarProcedimentos();
    // Reset procedimento selecionado quando mudar profissional
    this.selectedProcedimento = '0';
  }

  filtrarProcedimentos() {
    if (this.selectedProfissional === '0') {
      // Se "Todos os profissionais" selecionado, mostrar todos os procedimentos
      this.procedimentosFiltrados = [...this.procedimentos];
    } else {
      // Buscar procedimentos que o profissional selecionado pode realizar
      const profissionalId = parseInt(this.selectedProfissional);

      // Buscar o profissional selecionado na lista local
      const profissional = this.profissionais.find(p => p.id === profissionalId);

      if (profissional && profissional.competencias) {
        // Usar as competências do profissional se disponíveis
        this.procedimentosFiltrados = this.procedimentos.filter(proc =>
          profissional.competencias.includes(proc.id)
        );
      } else {
        // Fallback para lógica hardcoded
        this.procedimentosFiltrados = this.getProcedimentosPorProfissional(profissional);
      }
    }
  }

  private getProcedimentosPorProfissional(profissional: any): any[] {
    // Lógica hardcoded baseada nas especializações conhecidas
    const especializacoes: { [key: number]: number[] } = {
      1: [3], // Taynara - Cílios
      2: [4], // Mayara - Lábios
      3: [4], // Sara - Lábios
    };

    // Verificar se profissional.id é um número válido
    const profissionalId = typeof profissional?.id === 'number' ? profissional.id : null;
    const procedimentosIds = profissionalId ? especializacoes[profissionalId] || [] : [];

    if (procedimentosIds.length === 0) {
      // Se não tem especializações definidas, retornar todos
      return [...this.procedimentos];
    }

    // Filtrar procedimentos baseado nas especializações
    return this.procedimentos.filter(proc => procedimentosIds.includes(proc.id));
  }

  getProfissionalNome(): string {
    if (this.selectedProfissional === '0') {
      return 'todos os profissionais';
    }

    const profissional = this.profissionais.find(p => p.id === parseInt(this.selectedProfissional));
    return profissional ? profissional.nome : 'profissional selecionado';
  }

  liberarHorariosEspecificos() {
    if (!this.selectedDate) {
      alert('Selecione uma data primeiro');
      return;
    }

    const profissionalId = this.selectedProfissional === '0' ? null : parseInt(this.selectedProfissional);
    const procedimentoId = this.selectedProcedimento === '0' ? null : parseInt(this.selectedProcedimento);

    // Gerar horários entre o horário inicial e final
    const horarios = this.gerarHorariosIntervalo(this.horarioInicial, this.horarioFinal);

    // Criar alterações para todos os horários no intervalo
    const alteracoes = horarios.map(hora => ({
      time: hora,
      status: 'livre' as 'livre' | 'bloqueado'
    }));

    const batchData = {
      data: this.selectedDate,
      alteracoes: alteracoes,
      ...(profissionalId && { profissional_id: profissionalId }),
      ...(procedimentoId && { procedimento_id: procedimentoId })
    };

    this.api.salvarHorariosBatch(batchData).subscribe({
      next: (res) => {
        if (res.success) {
          alert(`Horários liberados com sucesso! ${alteracoes.length} horários liberados.`);
          this.loadAgendamentos(); // Recarrega para sincronizar
        } else {
          alert(res.message || 'Erro ao liberar horários');
        }
      },
      error: (err) => {
        alert('Erro ao comunicar com o servidor');
        console.error('Erro ao liberar horários:', err);
      }
    });
  }

  liberarSemanaEspecifica() {
    if (!this.selectedDate) {
      alert('Selecione uma data primeiro');
      return;
    }

    const profissionalId = this.selectedProfissional === '0' ? null : parseInt(this.selectedProfissional);
    const procedimentoId = this.selectedProcedimento === '0' ? null : parseInt(this.selectedProcedimento);

    // Calcular data de fim (7 dias a partir da data selecionada)
    const dataInicio = new Date(this.selectedDate);
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + 6);

    const dataFimString = dataFim.toISOString().split('T')[0];

    // Usar o método de liberar semana existente
    this.api.liberarSemana(this.selectedDate, dataFimString).subscribe({
      next: (res) => {
        if (res.success) {
          alert(`Semana liberada com sucesso! De ${this.selectedDate} até ${dataFimString}`);
          if (profissionalId || procedimentoId) {
            alert(`Nota: A liberação foi feita para todos os profissionais. Para liberar apenas para um profissional específico, use a opção "Liberar Horários Específicos".`);
          }
          this.loadAgendamentos();
        } else {
          alert(res.message || 'Erro ao liberar semana');
        }
      },
      error: (err) => {
        alert('Erro ao comunicar com o servidor');
        console.error('Erro ao liberar semana:', err);
      }
    });
  }

  private gerarHorariosIntervalo(horarioInicial: string, horarioFinal: string): string[] {
    const horarios: string[] = [];
    const inicio = new Date(`2000-01-01T${horarioInicial}:00`);
    const fim = new Date(`2000-01-01T${horarioFinal}:00`);

    let current = new Date(inicio);
    while (current <= fim) {
      horarios.push(current.toTimeString().substring(0, 5));
      current.setMinutes(current.getMinutes() + 15);
    }

    return horarios;
  }
}
