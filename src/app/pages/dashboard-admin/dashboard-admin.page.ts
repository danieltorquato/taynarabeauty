import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonItem, IonLabel, IonInput, IonList, IonSelect, IonSelectOption, IonSpinner, IonIcon, AlertController } from '@ionic/angular/standalone';
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
  imports: [IonIcon, IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonItem, IonLabel, IonInput, IonList, IonSpinner, CommonModule, FormsModule]
})
export class DashboardAdminPage implements OnInit, OnDestroy {
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

  // Estados de loading
  loadingProfissionais = true;
  loadingProcedimentos = true;
  loadingAgendamentos = true;

  // Estados para confirmação com delay
  liberarTodosConfirmando = false;
  bloquearTodosConfirmando = false;
  liberarTodosCountdown = 0;
  bloquearTodosCountdown = 0;
  liberarTodosInterval: any = null;
  bloquearTodosInterval: any = null;

  // Mapa de durações dos procedimentos (em minutos)
  procedimentoDuracoes: { [key: string]: number } = {
    'cilios': 60,      // 1 hora
    'labios': 90,      // 1.5 horas
    'combo': 150,      // 2.5 horas (cílios + lábios)
    'sobrancelhas': 45, // 45 minutos
    'micropigmentacao': 120, // 2 horas
    'permanente': 60,   // 1 hora
    'tintura': 30       // 30 minutos
  };

  constructor(private api: ApiService, private alertController: AlertController) { }

  ngOnInit() {
    this.generateTimeSlots();
    this.loadAgendamentos();
    this.loadProfissionais();
    this.loadProcedimentos();
  }

  ngOnDestroy() {
    // Limpar intervalos para evitar vazamentos de memória
    this.clearLiberarTodosInterval();
    this.clearBloquearTodosInterval();
  }

  // Mostrar alert com loading e confirmação após 5 segundos
  async showConfirmationAlert(
    title: string,
    message: string,
    confirmText: string,
    action: () => void
  ) {
    const alert = await this.alertController.create({
      header: title,
      message: message,
      backdropDismiss: false,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            // Resetar estados se cancelar
            this.liberarTodosConfirmando = false;
            this.bloquearTodosConfirmando = false;
            this.liberarTodosCountdown = 0;
            this.bloquearTodosCountdown = 0;
          }
        }
      ]
    });

    await alert.present();

    // Aguardar 5 segundos antes de mostrar o botão de confirmação
    let countdown = 5;
    const countdownInterval = setInterval(() => {
      countdown--;

      // Atualizar a mensagem do alert com countdown
      alert.message = `${message}\n\n⏳ Aguarde ${countdown} segundos para confirmar...`;

      if (countdown <= 0) {
        clearInterval(countdownInterval);

        // Adicionar botão de confirmação após 5 segundos
        alert.buttons = [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => {
              this.liberarTodosConfirmando = false;
              this.bloquearTodosConfirmando = false;
              this.liberarTodosCountdown = 0;
              this.bloquearTodosCountdown = 0;
            }
          },
          {
            text: confirmText,
            handler: () => {
              action();
            }
          }
        ];

        // Atualizar a mensagem final
        alert.message = `${message}\n\n✅ Pronto! Clique em "${confirmText}" para confirmar.`;
      }
    }, 1000);
  }

  // Mostrar alert simples de informação
  async showInfoAlert(title: string, message: string) {
    const alert = await this.alertController.create({
      header: title,
      message: message,
      buttons: ['OK']
    });
    await alert.present();
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

  // Mostrar alert de confirmação simples
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

  generateTimeSlots() {
    this.timeSlots = [];
    // Gerar horários de 8:00 às 18:00 de 15 em 15 minutos
    let currentTime = new Date();
    currentTime.setHours(8, 0, 0, 0);
    const endTime = new Date();
    endTime.setHours(18, 0, 0, 0);

    while (currentTime <= endTime) {
      const timeString = currentTime.toTimeString().substring(0, 5);

      // Verificar se há agendamento neste horário
      const agendamento = this.agendamentosData.find(ag => ag.hora === timeString);

      // Verificar conflitos baseado na duração do procedimento selecionado
      let status: 'livre' | 'bloqueado' | 'ocupado' = 'bloqueado'; // Padrão bloqueado
      let hasConflict = false;

      if (agendamento) {
        status = 'ocupado';
      } else if (this.selectedProcedimento !== '0') {
        // Verificar se há conflito de duração
        hasConflict = this.hasTimeConflict(timeString, this.selectedProcedimento);
        if (hasConflict) {
          status = 'bloqueado';
        } else {
          status = 'livre';
        }
      }

      this.timeSlots.push({
        time: timeString,
        status: status,
        originalStatus: status,
        cliente: agendamento?.cliente_nome,
        agendamento_id: agendamento?.id,
        hasChanges: false
      });

      currentTime.setMinutes(currentTime.getMinutes() + 15);
    }
  }

  loadAgendamentos() {
    this.loadingAgendamentos = true;
    this.api.getAdminAgendamentos(this.selectedDate).subscribe({
      next: (res) => {
        this.loadingAgendamentos = false;
        if (res.success) {
          this.agendamentosData = res.agendamentos;
          // Regenerar horários considerando conflitos de duração
          this.generateTimeSlots();
        }
      },
      error: (err) => {
        this.loadingAgendamentos = false;
        // Em caso de erro, regenerar horários mesmo assim
        this.generateTimeSlots();
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
      }
    });
  }

  async onDateChange() {
    if (this.hasUnsavedChanges) {
      const confirmChange = await this.showConfirmAlert(
        'Alterações Pendentes',
        'Você tem alterações não salvas. Deseja continuar e perder as alterações?',
        'Sim, continuar',
        'Cancelar'
      );
      if (!confirmChange) {
        return;
      }
    }
    this.clearPendingChanges();
    this.loadAgendamentos();
  }

  async toggleTimeSlot(slot: TimeSlot) {
    if (slot.originalStatus === 'ocupado') {
      await this.showInfoAlert(
        'Horário Ocupado',
        'Este horário já está ocupado com um agendamento e não pode ser alterado.'
      );
      return;
    }

    // Verificar se o horário está no período de almoço do profissional selecionado
    if (this.isHorarioAlmoco(slot.time)) {
      await this.showInfoAlert(
        'Período de Almoço',
        'Este horário está no período de almoço do profissional e não pode ser liberado.'
      );
      return;
    }

    // Toggle entre livre e bloqueado
    const newStatus = slot.status === 'livre' ? 'bloqueado' : 'livre';
    slot.status = newStatus;
    slot.hasChanges = slot.status !== slot.originalStatus;

    this.updatePendingChanges();
  }

  async liberarTodosHorarios() {
    if (!this.liberarTodosConfirmando) {
      // Iniciar processo de confirmação
      this.liberarTodosConfirmando = true;

      const title = '⚠️ CONFIRMAÇÃO NECESSÁRIA';
      const message = `Você está prestes a LIBERAR TODOS os horários do dia ${this.selectedDate}.\n\nEsta ação irá:\n• Liberar TODOS os horários disponíveis\n• Pode afetar a agenda de todos os profissionais\n• É uma ação IRREVERSÍVEL`;
      const confirmText = 'SIM, LIBERAR TODOS';

      await this.showConfirmationAlert(title, message, confirmText, () => {
        this.executeLiberarTodos();
        this.liberarTodosConfirmando = false;
      });
    }
  }

  private executeLiberarTodos() {
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
    this.liberarTodosConfirmando = false;
    this.liberarTodosCountdown = 0;
  }

  private clearLiberarTodosInterval() {
    if (this.liberarTodosInterval) {
      clearInterval(this.liberarTodosInterval);
      this.liberarTodosInterval = null;
    }
  }

  async bloquearTodosHorarios() {
    if (!this.bloquearTodosConfirmando) {
      // Iniciar processo de confirmação
      this.bloquearTodosConfirmando = true;

      const title = '⚠️ CONFIRMAÇÃO NECESSÁRIA';
      const message = `Você está prestes a BLOQUEAR TODOS os horários do dia ${this.selectedDate}.\n\nEsta ação irá:\n• Bloquear TODOS os horários disponíveis\n• Impedir novos agendamentos\n• É uma ação IRREVERSÍVEL`;
      const confirmText = 'SIM, BLOQUEAR TODOS';

      await this.showConfirmationAlert(title, message, confirmText, () => {
        this.executeBloquearTodos();
        this.bloquearTodosConfirmando = false;
      });
    }
  }

  private executeBloquearTodos() {
    this.timeSlots.forEach(slot => {
      if (slot.originalStatus !== 'ocupado') {
        slot.status = 'bloqueado';
        slot.hasChanges = slot.status !== slot.originalStatus;
      }
    });
    this.updatePendingChanges();
    this.bloquearTodosConfirmando = false;
    this.bloquearTodosCountdown = 0;
  }

  private clearBloquearTodosInterval() {
    if (this.bloquearTodosInterval) {
      clearInterval(this.bloquearTodosInterval);
      this.bloquearTodosInterval = null;
    }
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

  async salvarAlteracoes() {
    if (this.pendingChanges.length === 0) {
      await this.showInfoAlert(
        'Nenhuma Alteração',
        'Nenhuma alteração para salvar.'
      );
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
      next: async (res) => {
        if (res.success) {
          await this.showSuccessAlert('Alterações salvas com sucesso!');
          this.clearPendingChanges();
          this.loadAgendamentos(); // Recarrega para sincronizar com o banco
        } else {
          await this.showErrorAlert(res.message || 'Erro ao salvar alterações');
        }
      },
      error: async (err) => {
        await this.showErrorAlert('Erro ao comunicar com o servidor');
      }
    });
  }

  async descartarAlteracoes() {
    if (!this.hasUnsavedChanges) return;

    const confirmDiscard = await this.showConfirmAlert(
      'Descartar Alterações',
      'Tem certeza que deseja descartar todas as alterações?',
      'Sim, descartar',
      'Cancelar'
    );
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
    this.loadingProfissionais = true;
    // Carregar todos os profissionais sem filtro
    this.api.getProfissionais().subscribe({
      next: (res) => {
        this.loadingProfissionais = false;
        if (res.success) {
          this.profissionais = res.profissionais;
          // Inicializar com todos os procedimentos
          this.procedimentosFiltrados = [...this.procedimentos];
        } else {
          // Fallback: criar lista de profissionais hardcoded
          this.profissionais = [
            { id: 1, nome: 'Taynara Casagrande', competencias: [1, 2, 3, 5, 6], almoco_inicio: '12:00:00', almoco_fim: '13:00:00' },
            { id: 2, nome: 'Mayara Casagrande', competencias: [4], almoco_inicio: '12:00:00', almoco_fim: '13:00:00' },
            { id: 3, nome: 'Sara Casagrande', competencias: [4], almoco_inicio: '12:00:00', almoco_fim: '13:00:00' }
          ];
        }
      },
      error: (err) => {
        this.loadingProfissionais = false;
        // Fallback: criar lista de profissionais hardcoded
        this.profissionais = [
          { id: 1, nome: 'Taynara Casagrande', competencias: [1, 2, 3, 5, 6], almoco_inicio: '12:00:00', almoco_fim: '13:00:00' },
          { id: 2, nome: 'Mayara Casagrande', competencias: [4], almoco_inicio: '12:00:00', almoco_fim: '13:00:00' },
          { id: 3, nome: 'Sara Casagrande', competencias: [4], almoco_inicio: '12:00:00', almoco_fim: '13:00:00' }
        ];
      }
    });
  }

  loadProcedimentos() {
    this.loadingProcedimentos = true;
    this.api.getProcedimentos().subscribe({
      next: (res) => {
        this.loadingProcedimentos = false;
        if (res.success) {
          this.procedimentos = res.procedimentos;
          // Aplicar filtro baseado no profissional selecionado
          this.filtrarProcedimentos();
        }
      },
      error: (err) => {
        this.loadingProcedimentos = false;
        // Em caso de erro, mostrar todos os procedimentos
        this.procedimentosFiltrados = [...this.procedimentos];
      }
    });
  }

  selectProfissional(profissionalId: string) {
    this.selectedProfissional = profissionalId;
    this.filtrarProcedimentos();
    // Reset procedimento selecionado quando mudar profissional
    this.selectedProcedimento = '0';
    // Recarregar horários com o filtro do profissional
    this.loadAgendamentos();
  }

  selectProcedimento(procedimentoId: string) {
    this.selectedProcedimento = procedimentoId;
    // Regenerar horários considerando conflitos de duração
    this.generateTimeSlots();
    // Recarregar agendamentos para atualizar dados
    this.loadAgendamentos();
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
    if (this.selectedProfissional === '0') {
      // Se "Todos os profissionais" selecionado, mostrar todos os procedimentos
      this.procedimentosFiltrados = [...this.procedimentos];
    } else {
      // Buscar procedimentos que o profissional selecionado pode realizar
      const profissional = this.profissionais.find(p => String(p.id) === this.selectedProfissional);
      if (profissional && profissional.competencias) {
        // Usar as competências do profissional se disponíveis
        this.procedimentosFiltrados = this.procedimentos.filter(proc =>
          profissional.competencias.includes(proc.id)
        );
      } else {
        // Fallback para lógica hardcoded baseada na categoria
        this.procedimentosFiltrados = this.getProcedimentosPorProfissional(profissional);
      }
    }

    // Para combo, adicionar procedimentos individuais se o profissional pode fazer ambos
    this.addComboIndividualProcedures();
  }

  // Adicionar procedimentos individuais para combo e remover combo da lista
  private addComboIndividualProcedures() {
    const comboProcedimento = this.procedimentos.find(p => p.categoria === 'combo');
    if (!comboProcedimento) return;

    // Verificar se o profissional pode fazer combo (pode fazer cílios E lábios)
    const ciliosProcedimento = this.procedimentos.find(p => p.categoria === 'cilios');
    const labiosProcedimento = this.procedimentos.find(p => p.categoria === 'labios');

    if (ciliosProcedimento && labiosProcedimento) {
      // Se o profissional pode fazer combo, adicionar procedimentos individuais
      const canDoCombo = this.procedimentosFiltrados.some(p => p.categoria === 'combo');

      if (canDoCombo) {
        // Adicionar procedimentos individuais se não estiverem já na lista
        if (!this.procedimentosFiltrados.some(p => p.categoria === 'cilios')) {
          this.procedimentosFiltrados.push(ciliosProcedimento);
        }
        if (!this.procedimentosFiltrados.some(p => p.categoria === 'labios')) {
          this.procedimentosFiltrados.push(labiosProcedimento);
        }

        // Remover combo da lista de procedimentos filtrados
        this.procedimentosFiltrados = this.procedimentosFiltrados.filter(p => p.categoria !== 'combo');
      }
    }
  }

  private getProcedimentosPorProfissional(profissional: any): any[] {
    // Lógica hardcoded baseada nas especializações conhecidas
    const especializacoes: { [key: string]: string[] } = {
      '1': ['cilios'], // Taynara - Cílios
      '2': ['labios'], // Mayara - Lábios
      '3': ['labios'], // Sara - Lábios
    };

    // Converter ID para string para comparar corretamente
    const profissionalId = String(profissional?.id);
    const categorias = especializacoes[profissionalId] || [];
    if (categorias.length === 0) {
      // Se não tem especializações definidas, retornar todos
      return [...this.procedimentos];
    }

    // Filtrar procedimentos baseado nas categorias
    const procedimentosFiltrados = this.procedimentos.filter(proc => {
      return categorias.includes(proc.categoria);
    });
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
    // Verificar os tipos de ID na lista
    this.profissionais.forEach((p, index) => {
    });

    // Buscar profissional usando string (já que os IDs vêm como string)
    const profissional = this.profissionais.find(p => String(p.id) === this.selectedProfissional);
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
    const procedimento = this.procedimentosFiltrados.find(p => p.id === procedimentoId);

    if (!procedimento) return 'desconhecido';

    // Mapear categorias para nomes mais amigáveis
    switch (procedimento.categoria) {
      case 'cilios': return 'cílios';
      case 'labios': return 'lábios';
      case 'combo': return 'combo';
      default: return procedimento.categoria || 'desconhecido';
    }
  }

  async liberarHorariosEspecificos() {
    if (!this.selectedDate) {
      await this.showInfoAlert(
        'Data Necessária',
        'Selecione uma data primeiro'
      );
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
      next: async (res) => {
        if (res.success) {
          await this.showSuccessAlert(`Horários liberados com sucesso! ${alteracoes.length} horários liberados.`);
          this.loadAgendamentos(); // Recarrega para sincronizar
        } else {
          await this.showErrorAlert(res.message || 'Erro ao liberar horários');
        }
      },
      error: async (err) => {
        await this.showErrorAlert('Erro ao comunicar com o servidor');
      }
    });
  }

  async liberarSemanaEspecifica() {
    if (!this.selectedDate) {
      await this.showInfoAlert(
        'Data Necessária',
        'Selecione uma data primeiro'
      );
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

    const processarProximoDia = async () => {
      if (diasProcessados >= totalDias) {
        await this.showSuccessAlert(`Semana liberada com sucesso! De ${this.selectedDate} até ${dataFimString}`);
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
        error: async (err) => {
          await this.showErrorAlert(`Erro ao liberar horários para ${dataAtualString}`);
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

  // Métodos para estatísticas da agenda
  getAvailableSlots() {
    return this.timeSlots.filter(slot => slot.status === 'livre').length;
  }

  getBookedSlots() {
    return this.timeSlots.filter(slot => slot.status === 'ocupado').length;
  }

  getBlockedSlots() {
    return this.timeSlots.filter(slot => slot.status === 'bloqueado').length;
  }

  formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getProcedimentoIdByCategoria(categoria: string): number {
    if (categoria === 'combo') {
      const procedimento = this.procedimentos.find(p => p.categoria === 'combo' || p.nome.toLowerCase().includes('combo'));
      return procedimento ? procedimento.id : 0;
    }
    const procedimento = this.procedimentos.find(p => p.categoria === categoria);
    return procedimento ? procedimento.id : 0;
  }

  getProcedimentoIcon(categoria: string): string {
    const iconMap: { [key: string]: string } = {
      'cilios': 'eye-outline',
      'labios': 'eyedrop-outline',
      'combo': 'layers-outline',
      'sobrancelhas': 'eye-outline',
      'micropigmentacao': 'color-palette-outline',
      'permanente': 'flash-outline',
      'tintura': 'brush-outline'
    };

    return iconMap[categoria] || 'medical-outline';
  }

  // Verificar se um horário tem conflito baseado na duração do procedimento
  hasTimeConflict(timeSlot: string, procedimentoId: string): boolean {
    if (procedimentoId === '0') return false; // "Todos" não tem conflito

    const procedimento = this.procedimentosFiltrados.find(p => p.id.toString() === procedimentoId);
    if (!procedimento) return false;

    const duracao = this.procedimentoDuracoes[procedimento.categoria] || 60; // Default 60 min
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const startTime = hours * 60 + minutes; // converter para minutos
    const endTime = startTime + duracao;

    // Verificar se o horário final ultrapassa o horário de trabalho (18:00)
    const ultimoHorario = 18 * 60; // 18:00 em minutos
    if (endTime > ultimoHorario) {
      return true;
    }

    // Verificar conflitos com agendamentos existentes
    return this.checkConflictWithExistingAppointments(timeSlot, duracao);
  }

  // Verificar conflitos com agendamentos existentes
  private checkConflictWithExistingAppointments(timeSlot: string, duracao: number): boolean {
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const startTime = hours * 60 + minutes;
    const endTime = startTime + duracao;

    // Verificar conflitos com agendamentos do dia
    for (const agendamento of this.agendamentosData) {
      const [agHours, agMinutes] = agendamento.hora.split(':').map(Number);
      const agStartTime = agHours * 60 + agMinutes;

      // Obter duração do procedimento agendado
      const procedimentoAgendado = this.procedimentos.find(p => p.id === agendamento.procedimento_id);
      const agDuracao = procedimentoAgendado ?
        this.procedimentoDuracoes[procedimentoAgendado.categoria] || 60 : 60;
      const agEndTime = agStartTime + agDuracao;

      // Verificar sobreposição de horários
      if (this.timeRangesOverlap(startTime, endTime, agStartTime, agEndTime)) {
        return true;
      }
    }

    return false;
  }

  // Verificar se dois intervalos de tempo se sobrepõem
  private timeRangesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
    return start1 < end2 && start2 < end1;
  }

  // Obter duração de um procedimento
  getProcedimentoDuracao(procedimentoId: string): number {
    if (procedimentoId === '0') return 0;

    const procedimento = this.procedimentosFiltrados.find(p => p.id.toString() === procedimentoId);
    if (!procedimento) return 0;

    return this.procedimentoDuracoes[procedimento.categoria] || 60;
  }
}
