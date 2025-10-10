import { Component, OnInit } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { IonButton, IonLabel, IonItem, IonSelect, IonSelectOption, IonList, IonDatetime, IonChip, IonBackButton, IonContent, IonTitle, IonToolbar, IonHeader, IonButtons, IonIcon, IonSegmentButton, IonCard, IonCardContent, IonSegment, AlertController } from "@ionic/angular/standalone";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { addIcons } from 'ionicons';
import { calendarOutline, personOutline, informationCircleOutline, timeOutline, eyeOutline, heartOutline, eyedropOutline } from 'ionicons/icons';

@Component({
  selector: 'app-agendamento',
  templateUrl: './agendamentos.page.html',
  styleUrls: ['./agendamentos.page.scss'],
  standalone: true,
  imports: [IonButtons, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonLabel, IonList, IonDatetime, IonChip, IonBackButton, IonIcon, IonSegment, IonSegmentButton, CommonModule, FormsModule]
})
export class AgendamentoPage implements OnInit {
  procedimentos: any[] = [];
  profissionais: any[] = [];
  opcoes: any = {};
  selectedProcedimento: number = 0;
  selectedProfissional: number = 0; // 0 = Sem preferência
  selectedDate: string = new Date().toISOString();
  selectedTime: string = '';
  note: string = '';
  tipoCilios: string = '';
  corCilios: string = '';
  corLabios: string = '';

  // IDs das FK para combo
  tipoCiliosId: number | null = null;
  corCiliosId: number | null = null;
  corLabiosId: number | null = null;
  horariosDisponiveis: string[] = [];
  horariosDisponiveisFiltrados: string[] = [];
  selectedPeriod: string = 'all';
  sugestoes: any[] = [];

  // Dados dinâmicos calculados
  currentPrice = 0;
  currentDuration = 0;
  selectedOptions: any[] = [];

  // Cache para opções do combo (evita recálculos desnecessários)
  private _comboCiliosTypeOptions: any[] = [];
  private _comboCiliosCorOptions: any[] = [];
  private _comboLabiosCorOptions: any[] = [];
  private _comboOptionsCacheValid = false;

  // Propriedades públicas para o template (evita chamadas múltiplas)
  get comboCiliosTypeOptions(): any[] {
    if (!this.isComboSelected) {
      return [];
    }
    return this.getComboCiliosTypeOptions();
  }

  get comboCiliosCorOptions(): any[] {
    if (!this.isComboSelected) {
      return [];
    }
    return this.getComboCiliosCorOptions();
  }

  get comboLabiosCorOptions(): any[] {
    if (!this.isComboSelected) {
      return [];
    }
    return this.getComboLabiosCorOptions();
  }

  // IDs dos procedimentos por categoria (evita chamadas múltiplas no template)
  get ciliosProcedimentoId(): number {
    return this.getProcedimentoIdByCategoria('cilios');
  }

  get labiosProcedimentoId(): number {
    return this.getProcedimentoIdByCategoria('labios');
  }

  get comboProcedimentoId(): number {
    return this.getProcedimentoIdByCategoria('combo');
  }

  // Data mínima para o calendário (será calculada dinamicamente)
  minDate = '';

  // Cores de cílios disponíveis
  cilioCores = [
    { id: 'preto', label: 'Preto', color: '#000000' },
    { id: 'marrom', label: 'Marrom', color: '#8B4513' }
  ];

  // Verificação de duplicidade
  meusAgendamentos: any[] = [];
  meusAgendamentosFiltrados: any[] = [];
  hasActiveAppointment = false;
  selectedSegment = 'todos';

  constructor(private storage: Storage, private router: Router, private api: ApiService, private route: ActivatedRoute, public authService: AuthService, private alertController: AlertController) {
    // Registrar ícones
    addIcons({informationCircleOutline,eyeOutline,eyedropOutline,heartOutline,personOutline,calendarOutline,timeOutline});
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

  // Mostrar alert de erro
  async showErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: '❌ Erro',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  // TrackBy function para otimizar performance do ngFor
  trackByOptionId(index: number, item: any): any {
    return item ? (item.id || item.value || index) : index;
  }

  // Invalidar cache das opções do combo
  private invalidateComboCache() {
    this._comboOptionsCacheValid = false;
    this._comboCiliosTypeOptions = [];
    this._comboCiliosCorOptions = [];
    this._comboLabiosCorOptions = [];
  }

  // Calcular data mínima considerando hora atual e duração mínima
  private calculateMinDate(): string {
    // Usar fuso horário do Brasil (UTC-3)
    const now = new Date();
    const brazilTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));

    const currentHour = brazilTime.getHours();
    const currentMinute = brazilTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    // Duração mínima em minutos (30 min para cílios, 120 min para combo)
    const duracaoMinima = this.isComboSelected ? 120 : 30;

    // Último horário do dia (18:00 = 1080 minutos)
    const ultimoHorario = 18 * 60;

    const tempoFinal = currentTimeInMinutes + duracaoMinima;
    // Se não há tempo suficiente hoje, permitir a partir de amanhã
    if (tempoFinal > ultimoHorario) {
      const tomorrow = new Date(brazilTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      return tomorrowStr;
    }

    // Se há tempo suficiente hoje, permitir hoje
    const todayStr = brazilTime.toISOString().split('T')[0];
    return todayStr;
  }

  async ngOnInit() {
    await this.storage.create();

    // Calcular data mínima baseada na hora atual
    this.minDate = this.calculateMinDate();
    // Load procedures and professionals from database
    this.api.getProcedimentos().subscribe({
      next: (res) => {
        if (res.success) {
          this.procedimentos = res.procedimentos;
          this.opcoes = res.opcoes;

          // Set default procedure based on URL param
          const param = (this.route.snapshot.queryParamMap.get('service') || '').toLowerCase();
          if (param === 'cilios') {
            const ciliosProcedure = this.procedimentos.find(p => p.categoria === 'cilios');
            if (ciliosProcedure) {
              this.selectedProcedimento = ciliosProcedure.id;
              this.selectedProfissional = 0; // Sempre resetar para "Sem preferência"
              this.setDefaultOptions();
              // Carregar profissionais específicos para cílios
              this.loadProfissionais(ciliosProcedure.id);
            }
          } else if (param === 'labios') {
            const labiosProcedure = this.procedimentos.find(p => p.categoria === 'labios');
            if (labiosProcedure) {
              this.selectedProcedimento = labiosProcedure.id;
              this.selectedProfissional = 0; // Sempre resetar para "Sem preferência"
              this.setDefaultOptions();
              // Carregar profissionais específicos para lábios
              this.loadProfissionais(labiosProcedure.id);
            }
          } else if (this.procedimentos.length > 0) {
            this.selectedProcedimento = this.procedimentos[0].id;
            this.selectedProfissional = 0; // Sempre resetar para "Sem preferência"
            this.setDefaultOptions();
            // Carregar profissionais específicos para o primeiro procedimento
            this.loadProfissionais(this.procedimentos[0].id);
          }
        } else {
        }
      },
      error: (err) => {
      }
    });

    // Load user appointments to check for duplicates (only if logged in)
    if (this.authService.isAuthenticated) {
      this.loadMeusAgendamentos();
    }

    // Restaurar dados temporários se existirem (usuário retornou do login)
    this.restoreTemporaryAppointmentData();
  }

  private loadProfissionais(procedimentoId?: number) {
    this.api.getProfissionais(procedimentoId).subscribe({
      next: (res) => {
        if (res.success) {
          this.profissionais = res.profissionais;

          // Set default to "Sem preferência" (ID 0)
          this.selectedProfissional = 0;
        }
      },
      error: (err) => {
      }
    });
  }

  private loadMeusAgendamentos() {
    this.api.getMeusAgendamentos().subscribe({
      next: (res) => {
        if (res.success) {
          this.meusAgendamentos = res.agendamentos || [];
          this.checkForActiveAppointments();
          this.filtrarMeusAgendamentos();
        }
      },
      error: (err) => {
      }
    });
  }

  private checkForActiveAppointments() {
    const today = new Date().toISOString().split('T')[0];
    this.hasActiveAppointment = this.meusAgendamentos.some(agendamento => {
      const agendamentoData = agendamento.data;
      const status = agendamento.status;

      // Verificar se há agendamento pendente ou confirmado para hoje ou futuro
      return (status === 'pendente' || status === 'confirmado') && agendamentoData >= today;
    });
  }

  getActiveAppointmentsForToday(): any[] {
    const today = new Date().toISOString().split('T')[0];
    return this.meusAgendamentos.filter(agendamento => {
      const agendamentoData = agendamento.data;
      const status = agendamento.status;
      return (status === 'pendente' || status === 'confirmado') && agendamentoData === today;
    });
  }

  filtrarMeusAgendamentos() {
    if (this.selectedSegment === 'todos') {
      this.meusAgendamentosFiltrados = this.meusAgendamentos;
    } else {
      this.meusAgendamentosFiltrados = this.meusAgendamentos.filter((ag: any) =>
        ag.status === this.selectedSegment
      );
    }
  }

  onSegmentChange() {
    this.filtrarMeusAgendamentos();
  }

  navigateToMeusAgendamentos() {
    this.router.navigateByUrl('/meus-agendamentos');
  }

  private saveTemporaryAppointmentData() {
    const appointmentData = {
      selectedProcedimento: this.selectedProcedimento,
      selectedProfissional: this.selectedProfissional,
      selectedDate: this.selectedDate,
      selectedTime: this.selectedTime,
      tipoCilios: this.tipoCilios,
      corCilios: this.corCilios,
      corLabios: this.corLabios,
      note: this.note
    };
    localStorage.setItem('tempAppointmentData', JSON.stringify(appointmentData));
  }

  private restoreTemporaryAppointmentData() {
    const savedData = localStorage.getItem('tempAppointmentData');
    if (savedData) {
      try {
        const appointmentData = JSON.parse(savedData);
        this.selectedProcedimento = appointmentData.selectedProcedimento || 0;
        // NÃO restaurar selectedProfissional - sempre usar "Sem preferência" (0)
        this.selectedProfissional = 0;
        this.selectedDate = appointmentData.selectedDate || '';
        this.selectedTime = appointmentData.selectedTime || '';
        this.tipoCilios = appointmentData.tipoCilios || '';
        this.corCilios = appointmentData.corCilios || '';
        this.corLabios = appointmentData.corLabios || '';
        this.note = appointmentData.note || '';

        // Recalcular preço e duração
        this.calculatePriceAndDuration();

        // Recarregar horários se data foi selecionada
        if (this.selectedDate) {
          this.onDateChange();
        }

        // Limpar dados temporários
        localStorage.removeItem('tempAppointmentData');

        // Carregar agendamentos do usuário após login
        this.loadMeusAgendamentos();
      } catch (error) {
      }
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pendente': return 'warning';
      case 'confirmado': return 'success';
      case 'rejeitado': return 'danger';
      case 'cancelado': return 'medium';
      case 'faltou': return 'dark';
      default: return 'medium';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'confirmado': return 'Aprovado';
      case 'rejeitado': return 'Rejeitado';
      case 'cancelado': return 'Cancelado';
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
      return data;
    }
  }

  formatarHora(hora: string): string {
    return hora.substring(0, 5);
  }

  getNextProfissionalInQueue(): number {
    if (this.profissionais.length === 0) {
      return 0;
    }

    // Por enquanto, usar uma lógica simples baseada no localStorage
    // para manter a fila entre sessões
    const lastProfissionalId = localStorage.getItem('lastProfissionalId');

    if (lastProfissionalId) {
      const currentIndex = this.profissionais.findIndex(p => p.id === parseInt(lastProfissionalId));

      if (currentIndex !== -1) {
        // Próximo profissional na fila
        const nextIndex = (currentIndex + 1) % this.profissionais.length;
        const nextProfissionalId = this.profissionais[nextIndex].id;

        // Salvar o próximo profissional como o último usado
        localStorage.setItem('lastProfissionalId', nextProfissionalId.toString());

        return nextProfissionalId;
      }
    }

    // Se não há histórico, começar com o primeiro
    const firstProfissionalId = this.profissionais[0].id;
    localStorage.setItem('lastProfissionalId', firstProfissionalId.toString());

    return firstProfissionalId;
  }

  private buildObservacoes(): string | undefined {
    const parts: string[] = [];
    const proc = this.procedimentos.find(p => p.id === this.selectedProcedimento);
    if (proc) {
      if (proc.categoria === 'cilios') {
        if (this.tipoCilios) parts.push(`Tipo: ${this.tipoCilios}`);
        if (this.corCilios) parts.push(`Cor: ${this.corCilios}`);
      } else if (proc.categoria === 'labios') {
        if (this.corLabios) parts.push(`Cor: ${this.corLabios}`);
      }
    }
    if (this.note) parts.push(this.note);
    return parts.length ? parts.join(' | ') : undefined;
  }

  setDefaultOptions() {
    // Limpar todas as seleções - usuário deve selecionar manualmente
    this.tipoCilios = '';
    this.corCilios = '';
    this.corLabios = '';
    this.tipoCiliosId = null;
    this.corCiliosId = null;
    this.corLabiosId = null;
    this.currentPrice = 0;
    this.currentDuration = 0;
    this.selectedOptions = [];
  }

  // Métodos para atualizar seleções e recalcular
  updateTipoCilios(valor: string) {
    // Impedir desseleção - só permite selecionar se não estiver vazio
    if (!valor || valor === '') return;

    this.tipoCilios = valor;

    // Para combo, buscar o ID da FK nas combinações
    if (this.isComboSelected) {
      const opcao = this.selectedProcedimentoOpcoes.find(opt =>
        opt.tipo === 'combo_completo' &&
        this.getTipoCiliosValueFromLabel(opt.label) === valor
      );
      this.tipoCiliosId = opcao?.id_tipo_cilios || null;
      // Se já temos todos os IDs, buscar a combinação específica
      if (this.corCiliosId && this.corLabiosId) {
        this.buscarCombinacaoEspecifica();
      }
    }

    this.calculatePriceAndDuration();
    this.reloadHorariosIfNeeded();
  }

  updateCorCilios(valor: string) {
    // Impedir desseleção - só permite selecionar se não estiver vazio
    if (!valor || valor === '') return;

    this.corCilios = valor;

    // Para combo, buscar o ID da FK nas combinações
    if (this.isComboSelected) {
      const opcao = this.selectedProcedimentoOpcoes.find(opt =>
        opt.tipo === 'combo_completo' &&
        this.getCorCiliosValueFromLabel(opt.label) === valor
      );
      this.corCiliosId = opcao?.id_cor_cilios || null;
      // Se já temos todos os IDs, buscar a combinação específica
      if (this.tipoCiliosId && this.corLabiosId) {
        this.buscarCombinacaoEspecifica();
      }
    }

    // Recalcular pois cor pode afetar preço
    this.calculatePriceAndDuration();
    this.reloadHorariosIfNeeded();
  }

  updateCorLabios(valor: string) {
    // Impedir desseleção - só permite selecionar se não estiver vazio
    if (!valor || valor === '') return;

    this.corLabios = valor;

    // Para combo, buscar o ID da FK nas combinações
    if (this.isComboSelected) {
      const opcao = this.selectedProcedimentoOpcoes.find(opt =>
        opt.tipo === 'combo_completo' &&
        this.getCorLabiosValueFromLabel(opt.label) === valor
      );
      this.corLabiosId = opcao?.id_cor_labios || null;
      // Após selecionar a cor dos lábios, buscar a combinação específica
      this.buscarCombinacaoEspecifica();
    } else {
      // Para outros procedimentos, usar o cálculo normal
      this.calculatePriceAndDuration();
    }
    this.reloadHorariosIfNeeded();
  }

  // Método para buscar combinação específica no banco usando os 3 IDs
  buscarCombinacaoEspecifica() {
    try {
      if (!this.isComboSelected || !this.tipoCiliosId || !this.corCiliosId || !this.corLabiosId) {
        return;
      }

      if (!this.selectedProcedimentoOpcoes || !Array.isArray(this.selectedProcedimentoOpcoes)) {
        this.currentPrice = 0;
        this.currentDuration = 0;
        this.selectedOptions = [];
        return;
      }

      // Buscar a combinação específica nas opções carregadas
      const combinacao = this.selectedProcedimentoOpcoes.find(opt =>
        opt &&
        opt.tipo === 'combo_completo' &&
        opt.id_tipo_cilios === this.tipoCiliosId &&
        opt.id_cor_cilios === this.corCiliosId &&
        opt.id_cor_labios === this.corLabiosId
      );

      if (combinacao) {
        // Atualizar preço e duração diretamente do backend
        this.currentPrice = combinacao.preco_centavos || 0;
        this.currentDuration = combinacao.duracao || 0;
        this.selectedOptions = [combinacao];
      } else {
        this.currentPrice = 0;
        this.currentDuration = 0;
        this.selectedOptions = [];
      }
    } catch (error) {
      this.currentPrice = 0;
      this.currentDuration = 0;
      this.selectedOptions = [];
    }
  }

  selectProfissional(profissionalId: number) {
    this.selectedProfissional = profissionalId;
    // Quando mudar profissional, recarregar horários se já tem data selecionada
    if (this.selectedDate) {
      this.onDateChange();
    }
  }

  onProfissionalChange() {
    // Quando mudar profissional, recarregar horários se já tem data selecionada
    if (this.selectedDate) {
      this.onDateChange();
    }
  }

  onDateChange() {
    if (!this.selectedDate) {
      return;
    }

    // Corrigir problema de fuso horário - usar apenas a parte da data
    const date = this.selectedDate.split('T')[0];

    // Recalcular preço e duração antes de buscar horários
    this.calculatePriceAndDuration();

    // Para combo, definir duração padrão se não há opções selecionadas
    if (this.isComboSelected && this.currentDuration === 0) {
      this.currentDuration = 120; // 2 horas como duração padrão para combo
    }

    // Carregar agendamentos para verificação de conflitos
    this.loadAgendamentosForConflictCheck();

    this.api.getHorarios(date, this.selectedProfissional, this.selectedProcedimento).subscribe({
      next: (res) => {

        if (res.success) {
          if (res.horarios && Array.isArray(res.horarios) && res.horarios.length > 0) {
            // Mapear horários e remover duplicatas
            const horariosCompletos: string[] = res.horarios.map((h: any) => h.hora.substring(0, 5));
            this.horariosDisponiveis = [...new Set(horariosCompletos)].sort();
            this.filterHorariosByPeriod();
            this.sugestoes = []; // Limpar sugestões se há horários
          } else {
            this.horariosDisponiveis = [];
            this.horariosDisponiveisFiltrados = [];
            this.sugestoes = res.sugestoes || []; // Receber sugestões da API
          }
        } else {
          this.horariosDisponiveis = [];
          this.horariosDisponiveisFiltrados = [];
          this.sugestoes = [];
        }
      },
      error: (err) => {
        this.showErrorAlert(`Erro ao buscar horários: ${err.message}`);
        this.horariosDisponiveis = [];
        this.horariosDisponiveisFiltrados = [];
      }
    });
  }

  onPeriodChange() {
    this.filterHorariosByPeriod();
  }

  filterHorariosByPeriod() {
    let filteredHorarios = [...this.horariosDisponiveis];

    // Aplicar filtro de período
    if (this.selectedPeriod !== 'all') {
      filteredHorarios = filteredHorarios.filter(time => {
        const hour = parseInt(time.split(':')[0]);
        const isValid = this.isValidTimeForPeriod(time, hour);
        return isValid;
      });
    }

    // Aplicar filtro de duração (conflitos)
    filteredHorarios = filteredHorarios.filter(time => {
      return !this.conflictWithDuration(time);
    });

    this.horariosDisponiveisFiltrados = filteredHorarios;
  }

  private isValidTimeForPeriod(time: string, hour: number): boolean {
    switch (this.selectedPeriod) {
      case 'morning':
        return hour >= 6 && hour < 12; // 06:00 - 11:59
      case 'afternoon':
        return hour >= 12 && hour < 18; // 12:00 - 17:59
      case 'evening':
        return hour >= 18 && hour < 24; // 18:00 - 23:59
      default:
        return true;
    }
  }

  onSugestaoProximaData(sugestao: any) {
    this.selectedDate = sugestao.data;
    this.onDateChange();
  }

  onSugestaoOutroProfissional(sugestao: any) {
    this.selectedProfissional = sugestao.profissional_id;
    this.onDateChange();
  }

  async setProcedimento(procedimentoId: number) {
    this.selectedProcedimento = procedimentoId;

    // Invalidar cache quando procedimento muda
    this.invalidateComboCache();

    // Limpar horários e seleções quando procedimento muda
    this.horariosDisponiveis = [];
    this.horariosDisponiveisFiltrados = [];
    this.selectedTime = '';
    this.sugestoes = [];

    this.setDefaultOptions();
    this.calculatePriceAndDuration();

    // Recalcular data mínima baseada no novo procedimento
    this.minDate = this.calculateMinDate();

    await this.storage.set('selectedProcedimento', procedimentoId);

    // Resetar seleção de profissional antes de carregar novos
    this.selectedProfissional = 0;

    // Recarregar profissionais baseado no procedimento selecionado
    this.loadProfissionais(procedimentoId);

    // Recarregar horários se uma data já foi selecionada
    if (this.selectedDate) {
      this.onDateChange();
    }
  }

  // Helper methods for template
  get selectedProcedimentoCategoria(): string {
    const proc = this.procedimentos.find(p => p.id === this.selectedProcedimento);
    return proc?.categoria || '';
  }

  get isCiliosSelected(): boolean {
    return this.selectedProcedimentoCategoria === 'cilios';
  }

  getProcedimentoIdByCategoria(categoria: string): number {
    const procedimento = this.procedimentos.find(p => p.categoria === categoria);
    const id = procedimento ? procedimento.id : 0;
    return id;
  }

  get isLabiosSelected(): boolean {
    return this.selectedProcedimentoCategoria === 'labios';
  }

  get isComboSelected(): boolean {
    try {
      if (!this.selectedProcedimento || !this.procedimentos || !Array.isArray(this.procedimentos)) {
        return false;
      }

      const proc = this.procedimentos.find(p => p && p.id === this.selectedProcedimento);
      return proc ? (proc.categoria === 'combo' || (proc.nome && proc.nome.toLowerCase().includes('combo'))) : false;
    } catch (error) {
      return false;
    }
  }

  get selectedProcedimentoOpcoes(): any[] {
    return this.opcoes[this.selectedProcedimento] || [];
  }

  // Métodos para combo
  getComboCiliosTypeOptions(): any[] {
    // Retornar cache se válido
    if (this._comboOptionsCacheValid && this._comboCiliosTypeOptions.length > 0) {
      return this._comboCiliosTypeOptions;
    }

    try {
      if (!this.isComboSelected) {
        this._comboCiliosTypeOptions = [];
        return [];
      }

      // Verificar se selectedProcedimentoOpcoes existe e é array
      if (!this.selectedProcedimentoOpcoes || !Array.isArray(this.selectedProcedimentoOpcoes)) {
        this._comboCiliosTypeOptions = [];
        return [];
      }

      // Extrair tipos únicos de cílios das combinações de combo
      const tipos = new Set();
      const opcoesCombo = this.selectedProcedimentoOpcoes.filter(opt =>
        opt &&
        opt.tipo === 'combo_completo' &&
        opt.id_tipo_cilios
      );

      if (opcoesCombo.length === 0) {
        this._comboCiliosTypeOptions = [];
        return [];
      }

      opcoesCombo.forEach((opt) => {
        try {
          if (opt.id_tipo_cilios && opt.label) {
            const tipoData = {
              id: opt.id_tipo_cilios,
              label: this.extractTipoCiliosFromLabel(opt.label),
              value: this.getTipoCiliosValueFromLabel(opt.label)
            };
            tipos.add(JSON.stringify(tipoData));
          }
        } catch (error) {
        }
      });

      const result = Array.from(tipos).map(tipo => {
        try {
          return JSON.parse(tipo as string);
        } catch (error) {
          return null;
        }
      }).filter(item => item !== null);

      // Atualizar cache
      this._comboCiliosTypeOptions = result;
      this._comboOptionsCacheValid = true;
      return result;
    } catch (error) {
      this._comboCiliosTypeOptions = [];
      return [];
    }
  }

  getComboCiliosCorOptions(): any[] {
    // Retornar cache se válido
    if (this._comboOptionsCacheValid && this._comboCiliosCorOptions.length > 0) {
      return this._comboCiliosCorOptions;
    }

    try {
      if (!this.isComboSelected) {
        this._comboCiliosCorOptions = [];
        return [];
      }

      if (!this.selectedProcedimentoOpcoes || !Array.isArray(this.selectedProcedimentoOpcoes)) {
        this._comboCiliosCorOptions = [];
        return [];
      }

      // Extrair cores únicas de cílios das combinações de combo
      const cores = new Set();
      const opcoesCombo = this.selectedProcedimentoOpcoes.filter(opt =>
        opt &&
        opt.tipo === 'combo_completo' &&
        opt.id_cor_cilios
      );

      if (opcoesCombo.length === 0) {
        this._comboCiliosCorOptions = [];
        return [];
      }

      opcoesCombo.forEach((opt) => {
        try {
          if (opt.id_cor_cilios && opt.label) {
            const corData = {
              id: opt.id_cor_cilios,
              label: this.extractCorCiliosFromLabel(opt.label),
              value: this.getCorCiliosValueFromLabel(opt.label)
            };
            cores.add(JSON.stringify(corData));
          }
        } catch (error) {
        }
      });

      const result = Array.from(cores).map(cor => {
        try {
          return JSON.parse(cor as string);
        } catch (error) {
          return null;
        }
      }).filter(item => item !== null);

      // Atualizar cache
      this._comboCiliosCorOptions = result;
      this._comboOptionsCacheValid = true;
      return result;
    } catch (error) {
      this._comboCiliosCorOptions = [];
      return [];
    }
  }

  getComboLabiosCorOptions(): any[] {
    // Retornar cache se válido
    if (this._comboOptionsCacheValid && this._comboLabiosCorOptions.length > 0) {
      return this._comboLabiosCorOptions;
    }

    try {
      if (!this.isComboSelected) {
        this._comboLabiosCorOptions = [];
        return [];
      }

      if (!this.selectedProcedimentoOpcoes || !Array.isArray(this.selectedProcedimentoOpcoes)) {
        this._comboLabiosCorOptions = [];
        return [];
      }

      // Extrair cores únicas de lábios das combinações de combo
      const cores = new Set();
      const opcoesCombo = this.selectedProcedimentoOpcoes.filter(opt =>
        opt &&
        opt.tipo === 'combo_completo' &&
        opt.id_cor_labios
      );

      if (opcoesCombo.length === 0) {
        this._comboLabiosCorOptions = [];
        return [];
      }

      opcoesCombo.forEach((opt) => {
        try {
          if (opt.id_cor_labios && opt.label) {
            const corData = {
              id: opt.id_cor_labios,
              label: this.extractCorLabiosFromLabel(opt.label),
              value: this.getCorLabiosValueFromLabel(opt.label)
            };
            cores.add(JSON.stringify(corData));
          }
        } catch (error) {
        }
      });

      const result = Array.from(cores).map(cor => {
        try {
          return JSON.parse(cor as string);
        } catch (error) {
          return null;
        }
      }).filter(item => item !== null);

      // Atualizar cache
      this._comboLabiosCorOptions = result;
      this._comboOptionsCacheValid = true;
      return result;
    } catch (error) {
      this._comboLabiosCorOptions = [];
      return [];
    }
  }

  getCiliosTypeOptions(): any[] {
    return this.selectedProcedimentoOpcoes.filter(opt => opt.tipo === 'cilios_tipo');
  }

  // Métodos auxiliares para extrair informações dos labels de combo
  extractTipoCiliosFromLabel(label: string): string {
    try {
      if (!label || typeof label !== 'string') {
        return '';
      }
      // Exemplo: "Fio a Fio - Rímel + Preto + Ruby" -> "Fio a Fio - Rímel"
      const parts = label.split(' + ');
      return parts[0] || '';
    } catch (error) {
      return '';
    }
  }

  getTipoCiliosValueFromLabel(label: string): string {
    try {
      const tipo = this.extractTipoCiliosFromLabel(label);
      return tipo === 'Fio a Fio - Rímel' ? 'fio_rimel' :
             tipo === 'Volume Brasileiro' ? 'volume_brasileiro' :
             tipo === 'Volume Inglês' ? 'volume_ingles' :
             tipo === 'Fox Eyes - Raposinha' ? 'fox_eyes' : 'lash_lifting';
    } catch (error) {
      return 'lash_lifting';
    }
  }

  extractCorCiliosFromLabel(label: string): string {
    try {
      if (!label || typeof label !== 'string') {
        return '';
      }
      // Exemplo: "Fio a Fio - Rímel + Preto + Ruby" -> "Preto"
      const parts = label.split(' + ');
      return parts[1] || '';
    } catch (error) {
      return '';
    }
  }

  getCorCiliosValueFromLabel(label: string): string {
    try {
      const cor = this.extractCorCiliosFromLabel(label);
      return cor ? cor.toLowerCase() : '';
    } catch (error) {
      return '';
    }
  }

  extractCorLabiosFromLabel(label: string): string {
    try {
      if (!label || typeof label !== 'string') {
        return '';
      }
      // Exemplo: "Fio a Fio - Rímel + Preto + Ruby" -> "Ruby"
      const parts = label.split(' + ');
      return parts[2] || '';
    } catch (error) {
      return '';
    }
  }

  getCorLabiosValueFromLabel(label: string): string {
    try {
      const cor = this.extractCorLabiosFromLabel(label);
      return cor ? cor.toLowerCase() : '';
    } catch (error) {
      return '';
    }
  }

  // Método para obter opções de combo
  getComboOptions(): any[] {
    return this.selectedProcedimentoOpcoes.filter(opt => opt.tipo === 'combo');
  }

  getCiliosCorOptions(): any[] {
    return this.selectedProcedimentoOpcoes.filter(opt => opt.tipo === 'cilios_cor');
  }

  getLabiosCorOptions(): any[] {
    return this.selectedProcedimentoOpcoes.filter(opt => opt.tipo === 'labios_cor');
  }

  // Métodos auxiliares para labels
  getTipoCiliosLabel(tipo: string): string {
    const labels: { [key: string]: string } = {
      'fio_rimel': 'Fio a Fio - Rímel',
      'volume_brasileiro': 'Volume Brasileiro',
      'volume_ingles': 'Volume Inglês',
      'fox_eyes': 'Fox Eyes - Raposinha',
      'lash_lifting': 'Lash Lifting'
    };
    return labels[tipo] || tipo;
  }

  getLabiosCorLabel(cor: string): string {
    const labels: { [key: string]: string } = {
      'ruby': 'Ruby',
      'darling': 'Darling',
      'full_lips': 'Full Lips',
      'peach': 'Peach',
      'penelope': 'Penélope',
      'red_life': 'Red Life',
      'red_rose': 'Red Rose',
      'san': 'San',
      'terracota': 'Terracota',
      'true_love': 'True Love',
      'utopia': 'Utopia'
    };
    return labels[cor] || cor;
  }

  getCorBackground(opcao: any): string {
    // Se tem campo hex, usa ele
    if (opcao.hex) {
      return opcao.hex;
    }

    // Se o value é um código hex (começa com #), usa ele
    if (opcao.value && opcao.value.startsWith('#')) {
      return opcao.value;
    }

    // Fallbacks para cores específicas por nome
    if (opcao.value === 'ruby') {
      return '#BC3B58';
    }

    // Fallback para cor padrão
    return '#E8B0A0';
  }

  calculatePriceAndDuration() {
    this.currentPrice = 0;
    this.currentDuration = 0;
    this.selectedOptions = [];

    const opcoes = this.selectedProcedimentoOpcoes;

    if (this.isCiliosSelected) {
      // Para cílios individuais, buscar pela opção tipo selecionada
      const ciliosOpcao = opcoes.find(opt => opt.tipo === 'cilios_tipo' && opt.value === this.tipoCilios);
      if (ciliosOpcao) {
        this.currentPrice = ciliosOpcao.preco_centavos || 0;
        this.currentDuration = ciliosOpcao.duracao || 0;
        this.selectedOptions = [ciliosOpcao];

        // Verificar se há opção de cor específica que afeta o preço
        const ciliosCorOpcao = opcoes.find(opt => opt.tipo === 'cilios_cor' && opt.value === this.corCilios);
        if (ciliosCorOpcao && ciliosCorOpcao.preco_centavos) {
          this.currentPrice += ciliosCorOpcao.preco_centavos;
          this.selectedOptions.push(ciliosCorOpcao);
        }
      }
    } else if (this.isLabiosSelected) {
      // Para lábios, buscar pela cor específica selecionada
      const labiosOpcao = opcoes.find(opt => opt.tipo === 'labios_cor' && opt.value === this.corLabios);
      if (labiosOpcao) {
        this.currentPrice = labiosOpcao.preco_centavos || 0;
        this.currentDuration = labiosOpcao.duracao || 0;
        this.selectedOptions = [labiosOpcao];
      } else {
        // Fallback para primeira opção se não encontrar a cor selecionada
        const firstLabios = opcoes.find(opt => opt.tipo === 'labios_cor');
        if (firstLabios) {
          this.currentPrice = firstLabios.preco_centavos || 0;
          this.currentDuration = firstLabios.duracao || 0;
          this.selectedOptions = [firstLabios];
        }
      }
        } else if (this.isComboSelected) {

          // Para combo, buscar a combinação específica usando as FK
          const comboOpcao = opcoes.find(opt =>
            opt.tipo === 'combo_completo' &&
            opt.id_tipo_cilios === this.tipoCiliosId &&
            opt.id_cor_cilios === this.corCiliosId &&
            opt.id_cor_labios === this.corLabiosId
          );
          if (comboOpcao) {
            this.currentPrice = comboOpcao.preco_centavos || 0;
            this.currentDuration = comboOpcao.duracao || 0;
            this.selectedOptions = [comboOpcao];
          } else {
            // Se não encontrou a combinação específica, definir preço como 0
            // (isso não deveria acontecer se os IDs estiverem corretos)
            this.currentPrice = 0;
            this.currentDuration = 0;
            this.selectedOptions = [];
          }
        }
  }

  // Método para verificar se um horário conflita com a duração
  conflictWithDuration(timeSlot: string): boolean {
    // Se não há duração definida, não há conflito
    if (!this.currentDuration || this.currentDuration === 0) return false;

    const [hours, minutes] = timeSlot.split(':').map(Number);
    const startTime = hours * 60 + minutes; // converter para minutos
    const endTime = startTime + this.currentDuration;

    // Verificar se o horário final ultrapassa o último horário disponível do dia (18:00)
    const ultimoHorario = 18 * 60; // 18:00 em minutos
    if (endTime > ultimoHorario) {
      return true; // Conflita porque não há tempo suficiente no dia
    }

    // Verificar conflitos com agendamentos existentes
    return this.hasConflictWithExistingAppointments(timeSlot);
  }

  // Cache de agendamentos para evitar múltiplas consultas
  private agendamentosCache: { [data: string]: any[] } = {};
  private agendamentosCacheTime: { [data: string]: number } = {};
  private readonly CACHE_DURATION = 30000; // 30 segundos

  // Método para verificar conflitos com agendamentos existentes
  hasConflictWithExistingAppointments(timeSlot: string): boolean {
    if (!this.selectedDate || !this.currentDuration) return false;

    // Verificar se temos agendamentos em cache para esta data
    const cacheKey = this.selectedDate;
    const now = Date.now();

    if (this.agendamentosCache[cacheKey] &&
        this.agendamentosCacheTime[cacheKey] &&
        (now - this.agendamentosCacheTime[cacheKey]) < this.CACHE_DURATION) {

      // Usar cache
      return this.checkConflictsWithCachedAppointments(timeSlot, this.agendamentosCache[cacheKey]);
    }

    // Se não há cache válido, buscar agendamentos
    this.loadAgendamentosForConflictCheck();
    return false; // Por enquanto, não bloquear até carregar
  }

  // Método para carregar agendamentos para verificação de conflitos
  private loadAgendamentosForConflictCheck() {
    if (!this.selectedDate) return;

    this.api.getAgendamentosPorData(this.selectedDate).subscribe({
      next: (res) => {
        if (res.success && res.agendamentos) {
          // Armazenar no cache
          this.agendamentosCache[this.selectedDate] = res.agendamentos;
          this.agendamentosCacheTime[this.selectedDate] = Date.now();

          // Recarregar horários com os dados atualizados
          this.filterHorariosByPeriod();
        }
      },
      error: (err) => {
        // Em caso de erro, não bloquear horários
      }
    });
  }

  // Método para verificar conflitos com agendamentos em cache
  private checkConflictsWithCachedAppointments(timeSlot: string, agendamentos: any[]): boolean {
    for (const agendamento of agendamentos) {
      if (this.checkTimeConflict(timeSlot, agendamento)) {
        return true;
      }
    }
    return false;
  }

  // Método para verificar conflito entre dois horários
  checkTimeConflict(newTimeSlot: string, existingAppointment: any): boolean {
    if (!existingAppointment.hora || !existingAppointment.procedimento_id) return false;

    // Se há um profissional específico selecionado, verificar se é o mesmo
    if (this.selectedProfissional && this.selectedProfissional > 0) {
      if (existingAppointment.profissional_id &&
          existingAppointment.profissional_id !== this.selectedProfissional) {
        return false; // Não há conflito se são profissionais diferentes
      }
    }

    // Calcular duração do agendamento existente
    const existingDuration = this.getAppointmentDuration(existingAppointment.procedimento_id);
    if (!existingDuration) return false;

    // Converter horários para minutos
    const [newHours, newMinutes] = newTimeSlot.split(':').map(Number);
    const newStart = newHours * 60 + newMinutes;
    const newEnd = newStart + this.currentDuration;

    const [existingHours, existingMinutes] = existingAppointment.hora.split(':').map(Number);
    const existingStart = existingHours * 60 + existingMinutes;
    const existingEnd = existingStart + existingDuration;

    // Verificar se há sobreposição de horários
    return (newStart < existingEnd && newEnd > existingStart);
  }

  // Método para obter duração de um agendamento baseado no procedimento
  getAppointmentDuration(procedimentoId: number): number {
    const durationMap: { [key: number]: number } = {
      1: 30,  // Design de sobrancelhas
      2: 45,  // Micropigmentação
      3: 30,  // Cílios
      4: 60,  // Lábios
      5: 120, // Combo (cílios + lábios)
    };

    return durationMap[procedimentoId] || 60; // Default 60 minutos
  }

  // Método para invalidar cache de agendamentos
  private invalidateAgendamentosCache() {
    this.agendamentosCache = {};
    this.agendamentosCacheTime = {};
  }

  // Método para recarregar horários quando necessário (sem loops)
  private reloadHorariosIfNeeded() {
    if (this.selectedDate) {
      // Usar setTimeout para evitar loops síncronos
      setTimeout(() => {
        this.onDateChange();
      }, 0);
    }
  }

  onSubmit() {
    if (!this.selectedProcedimento || !this.selectedDate || !this.selectedTime) {
      this.showInfoAlert('Seleção Necessária', 'Selecione procedimento, data e horário.');
      return;
    }

    if (this.selectedProfissional === null || this.selectedProfissional === undefined) {
      this.showInfoAlert('Profissional Necessário', 'Selecione um profissional ou escolha "Sem preferência" para agendamento automático.');
      return;
    }

    // Validar se todas as opções de combo estão selecionadas
    if (this.isComboSelected) {
      if (!this.tipoCilios || !this.corCilios || !this.corLabios) {
        this.showInfoAlert('Opções do Combo', 'Selecione todas as opções do combo: tipo de cílios, cor dos cílios e cor dos lábios.');
        return;
      }
    } else if (this.isCiliosSelected) {
      if (!this.tipoCilios || !this.corCilios) {
        this.showInfoAlert('Opções dos Cílios', 'Selecione o tipo e cor dos cílios.');
        return;
      }
    } else if (this.isLabiosSelected) {
      if (!this.corLabios) {
        this.showInfoAlert('Cor dos Lábios', 'Selecione a cor dos lábios.');
        return;
      }
    }

    // Verificar se o usuário está logado
    if (!this.authService.isAuthenticated) {
      // Salvar dados do agendamento temporariamente
      this.saveTemporaryAppointmentData();
      // Redirecionar para página de aviso
      this.router.navigate(['/agendamento-aviso']);
      return;
    }

    // Se chegou até aqui, o usuário está logado, continuar com o agendamento
    this.proceedWithAppointment();
  }

  private proceedWithAppointment() {
    // A verificação de conflitos de horário agora é feita pelo backend

    const dateIso = this.selectedDate;
    const date = dateIso ? dateIso.slice(0, 10) : '';

    // Se "Sem preferência" foi selecionado (selectedProfissional = 0), usar sistema de fila
    let profissionalId = this.selectedProfissional;
    if (profissionalId === 0) {
      profissionalId = this.getNextProfissionalInQueue();
      if (profissionalId === 0) {
        this.showInfoAlert('Profissional Indisponível', 'Nenhum profissional disponível para este horário. Tente outro horário.');
        return;
      }
    } else {
      // Salvar o profissional selecionado para manter a fila
      localStorage.setItem('lastProfissionalId', profissionalId.toString());
    }

    this.api.createAppointment({
      procedimento_id: this.selectedProcedimento,
      profissional_id: profissionalId,
      data: date,
      hora: this.selectedTime,
      observacoes: this.buildObservacoes(),
      opcao_cilios: this.tipoCilios || undefined,
      cor_cilios: this.corCilios || undefined,
      opcao_labios: this.corLabios || undefined,
    }).subscribe({
      next: (res) => {
        if (res?.success) {
          // Invalidar cache de agendamentos após criar com sucesso
          this.invalidateAgendamentosCache();

          const state = {
            id: res.id,
            servico: this.procedimentos.find(p => p.id === this.selectedProcedimento)?.nome || 'Procedimento',
            data: date,
            hora: this.selectedTime,
            whatsapp: res.whatsapp,
            emailSent: !!res.emailSent,
            tipoCilios: this.tipoCilios || undefined,
            corCilios: this.corCilios || undefined,
            corLabios: this.corLabios || undefined,
            profissionalNome: this.profissionais.find(p => p.id === profissionalId)?.nome || 'Profissional',
          };
          this.router.navigateByUrl('/confirmacao', { state });
        } else {
          this.showErrorAlert(res?.message || 'Não foi possível criar o agendamento.');
        }
      },
      error: (err) => {
        this.showErrorAlert(err?.error?.message || 'Erro ao comunicar com o servidor.');
      }
    });
  }
}
