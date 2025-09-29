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

    // Determinar profissional e procedimento para filtro
    const profissionalId = this.selectedProfissional === '0' ? undefined : parseInt(this.selectedProfissional);
    const procedimentoId = this.selectedProcedimento === '0' ? undefined : parseInt(this.selectedProcedimento);

    // Load available times from backend com filtros
    this.api.getHorarios(this.selectedDate, profissionalId, procedimentoId).subscribe({
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

        // Mark booked slots (filtrar por profissional se selecionado)
        this.agendamentosData.forEach(agendamento => {
          // Se um profissional específico está selecionado, filtrar agendamentos
          if (profissionalId && agendamento.profissional_id !== profissionalId) {
            return;
          }

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

    // Verificar se o horário está no período de almoço do profissional selecionado
    if (this.isHorarioAlmoco(slot.time)) {
      alert('Este horário está no período de almoço do profissional e não pode ser liberado.');
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
        // Verificar se o horário está no período de almoço do profissional selecionado
        if (this.isHorarioAlmoco(slot.time)) {
          // Manter bloqueado se estiver no horário de almoço e NÃO marcar como alterado
          slot.status = 'bloqueado';
          slot.hasChanges = false; // Não incluir nas alterações pendentes
        } else {
          slot.status = 'livre';
          slot.hasChanges = slot.status !== slot.originalStatus;
        }
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
        // Não incluir horários de almoço nas alterações pendentes
        if (!this.isHorarioAlmoco(slot.time)) {
          this.pendingChanges.push({
            time: slot.time,
            status: slot.status as 'livre' | 'bloqueado'
          });
        }
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

    const profissionalId = this.selectedProfissional === '0' ? undefined : parseInt(this.selectedProfissional);
    const procedimentoId = this.selectedProcedimento === '0' ? undefined : parseInt(this.selectedProcedimento);

    const batchData = {
      data: this.selectedDate,
      alteracoes: this.pendingChanges,
      ...(profissionalId && { profissional_id: profissionalId }),
      ...(procedimentoId && { procedimento_id: procedimentoId })
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
    console.log('Carregando profissionais...');
    this.api.getProfissionais().subscribe({
      next: (res) => {
        console.log('Resposta da API de profissionais:', res);
        if (res.success) {
          this.profissionais = res.profissionais;
          console.log('Profissionais carregados:', this.profissionais);
          // Inicializar com todos os procedimentos
          this.procedimentosFiltrados = [...this.procedimentos];
        } else {
          console.error('Erro na resposta da API:', res.message);
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
    // Recarregar horários com o filtro do profissional
    this.loadAgendamentos();
  }

  onProcedimentoChange() {
    // Recarregar horários com o filtro do procedimento
    this.loadAgendamentos();
  }

  filtrarProcedimentos() {
    console.log('Filtrando procedimentos para profissional:', this.selectedProfissional);

    if (this.selectedProfissional === '0') {
      // Se "Todos os profissionais" selecionado, mostrar todos os procedimentos
      this.procedimentosFiltrados = [...this.procedimentos];
      console.log('Mostrando todos os procedimentos:', this.procedimentosFiltrados.length);
    } else {
      // Buscar procedimentos que o profissional selecionado pode realizar
      const profissionalId = parseInt(this.selectedProfissional);

      // Buscar o profissional selecionado na lista local (usar string)
      const profissional = this.profissionais.find(p => String(p.id) === this.selectedProfissional);
      console.log('Profissional encontrado para filtro:', profissional);

      if (profissional && profissional.competencias) {
        // Usar as competências do profissional se disponíveis
        this.procedimentosFiltrados = this.procedimentos.filter(proc =>
          profissional.competencias.includes(proc.id)
        );
        console.log('Filtrado por competências:', this.procedimentosFiltrados.length);
      } else {
        // Fallback para lógica hardcoded
        this.procedimentosFiltrados = this.getProcedimentosPorProfissional(profissional);
        console.log('Filtrado por lógica hardcoded:', this.procedimentosFiltrados.length);
        console.log('Procedimentos filtrados:', this.procedimentosFiltrados);
      }
    }
  }

  private getProcedimentosPorProfissional(profissional: any): any[] {
    console.log('getProcedimentosPorProfissional chamado com:', profissional);

    // Lógica hardcoded baseada nas especializações conhecidas
    const especializacoes: { [key: string]: string[] } = {
      '1': ['cilios'], // Taynara - Cílios
      '2': ['labios'], // Mayara - Lábios
      '3': ['labios'], // Sara - Lábios
    };

    // Converter ID para string para comparar corretamente
    const profissionalId = String(profissional?.id);
    console.log('Profissional ID extraído (string):', profissionalId);

    const categorias = especializacoes[profissionalId] || [];
    console.log('Categorias para filtrar:', categorias);

    if (categorias.length === 0) {
      // Se não tem especializações definidas, retornar todos
      console.log('Nenhuma categoria encontrada, retornando todos os procedimentos');
      return [...this.procedimentos];
    }

    // Filtrar procedimentos baseado nas categorias
    const procedimentosFiltrados = this.procedimentos.filter(proc => {
      console.log(`Verificando procedimento ${proc.nome} (categoria: ${proc.categoria})`);
      return categorias.includes(proc.categoria);
    });

    console.log('Procedimentos filtrados finais:', procedimentosFiltrados);
    return procedimentosFiltrados;
  }

  getProfissionalNome(): string {
    if (this.selectedProfissional === '0') {
      return 'todos os profissionais';
    }

    // Verificar se a lista de profissionais ainda não foi carregada
    if (!this.profissionais || this.profissionais.length === 0) {
      return 'carregando...';
    }

    const profissionalId = parseInt(this.selectedProfissional);
    console.log('Buscando profissional com ID:', profissionalId, 'tipo:', typeof profissionalId);
    console.log('Lista de profissionais:', this.profissionais);

    // Verificar os tipos de ID na lista
    this.profissionais.forEach((p, index) => {
      console.log(`Profissional ${index}: ID=${p.id}, tipo=${typeof p.id}, nome=${p.nome}`);
    });

    // Buscar profissional usando string (já que os IDs vêm como string)
    const profissional = this.profissionais.find(p => String(p.id) === this.selectedProfissional);

    console.log('Profissional encontrado:', profissional);

    return profissional ? profissional.nome : 'profissional não encontrado';
  }

  getProcedimentoNome(): string {
    if (this.selectedProcedimento === '0') {
      return 'todos os procedimentos';
    }

    const procedimentoId = parseInt(this.selectedProcedimento);
    const procedimento = this.procedimentos.find(p => p.id === procedimentoId);
    return procedimento ? procedimento.nome : 'procedimento não encontrado';
  }

  getProcedimentoCategoria(): string {
    if (this.selectedProcedimento === '0') {
      return 'todos';
    }

    const procedimentoId = parseInt(this.selectedProcedimento);
    const procedimento = this.procedimentos.find(p => p.id === procedimentoId);

    if (!procedimento) return 'desconhecido';

    // Mapear categorias para nomes mais amigáveis
    switch (procedimento.categoria) {
      case 'cilios': return 'cílios';
      case 'labios': return 'lábios';
      case 'combo': return 'combo';
      default: return procedimento.categoria || 'desconhecido';
    }
  }

  liberarHorariosEspecificos() {
    if (!this.selectedDate) {
      alert('Selecione uma data primeiro');
      return;
    }

    const profissionalId = this.selectedProfissional === '0' ? undefined : parseInt(this.selectedProfissional);
    const procedimentoId = this.selectedProcedimento === '0' ? undefined : parseInt(this.selectedProcedimento);

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

    const profissionalId = this.selectedProfissional === '0' ? undefined : parseInt(this.selectedProfissional);
    const procedimentoId = this.selectedProcedimento === '0' ? undefined : parseInt(this.selectedProcedimento);

    // Calcular data de fim (7 dias a partir da data selecionada)
    const dataInicio = new Date(this.selectedDate);
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + 6);

    const dataFimString = dataFim.toISOString().split('T')[0];

    // Gerar horários para cada dia da semana
    const horarios = this.gerarHorariosIntervalo(this.horarioInicial || '08:00', this.horarioFinal || '18:00');

    // Processar cada dia da semana
    let diaAtual = new Date(dataInicio);
    let diasProcessados = 0;
    const totalDias = 7;

    const processarProximoDia = () => {
      if (diasProcessados >= totalDias) {
        alert(`Semana liberada com sucesso! De ${this.selectedDate} até ${dataFimString}`);
        this.loadAgendamentos();
        return;
      }

      const dataAtualString = diaAtual.toISOString().split('T')[0];

      // Criar alterações para todos os horários do dia
      const alteracoes = horarios.map(hora => ({
        time: hora,
        status: 'livre' as 'livre' | 'bloqueado'
      }));

      const batchData = {
        data: dataAtualString,
        alteracoes: alteracoes,
        ...(profissionalId && { profissional_id: profissionalId }),
        ...(procedimentoId && { procedimento_id: procedimentoId })
      };

      this.api.salvarHorariosBatch(batchData).subscribe({
        next: (res) => {
          diasProcessados++;
          diaAtual.setDate(diaAtual.getDate() + 1);
          processarProximoDia();
        },
        error: (err) => {
          alert(`Erro ao liberar horários para ${dataAtualString}`);
          console.error('Erro ao liberar semana:', err);
        }
      });
    };

    processarProximoDia();
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

  isHorarioAlmoco(horario: string): boolean {
    // Se nenhum profissional selecionado, não bloquear
    if (this.selectedProfissional === '0') {
      return false;
    }

    // Buscar o profissional selecionado
    const profissionalId = this.selectedProfissional;
    const profissional = this.profissionais.find(p => String(p.id) === profissionalId);

    // Se não encontrar o profissional ou não tiver horário de almoço definido, não bloquear
    if (!profissional || !profissional.almoco_inicio || !profissional.almoco_fim) {
      return false;
    }

    // Converter horários para minutos desde a meia-noite para facilitar comparação
    const horarioMinutos = this.converterHorarioParaMinutos(horario);
    const almocoInicioMinutos = this.converterHorarioParaMinutos(profissional.almoco_inicio);
    const almocoFimMinutos = this.converterHorarioParaMinutos(profissional.almoco_fim);

    // Verificar se o horário está dentro do período de almoço
    return horarioMinutos >= almocoInicioMinutos && horarioMinutos < almocoFimMinutos;
  }

  private converterHorarioParaMinutos(horario: string): number {
    const partes = horario.split(':');
    const horas = parseInt(partes[0], 10);
    const minutos = parseInt(partes[1], 10);
    return horas * 60 + minutos;
  }
}
