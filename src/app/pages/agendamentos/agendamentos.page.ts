import { Component, OnInit } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { IonButton, IonLabel, IonItem, IonSelect, IonSelectOption, IonList, IonDatetime, IonChip, IonBackButton, IonContent, IonTitle, IonToolbar, IonHeader, IonButtons, IonIcon, IonSegmentButton, IonCard, IonCardContent, IonSegment } from "@ionic/angular/standalone";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { addIcons } from 'ionicons';
import { calendarOutline, personOutline, informationCircleOutline, timeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-agendamento',
  templateUrl: './agendamentos.page.html',
  styleUrls: ['./agendamentos.page.scss'],
  standalone: true,
  imports: [IonButtons, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonLabel, IonItem, IonSelect, IonSelectOption, IonList, IonDatetime, IonChip, IonBackButton, IonIcon, CommonModule, FormsModule]
})
export class AgendamentoPage implements OnInit {
  procedimentos: any[] = [];
  profissionais: any[] = [];
  opcoes: any = {};
  selectedProcedimento: number = 0;
  selectedProfissional: number = 0; // 0 = Sem preferência
  selectedDate: string = '';
  selectedTime: string = '';
  note: string = '';
  tipoCilios: string = '';
  corCilios: string = '';
  corLabios: string = '';
  horariosDisponiveis: string[] = [];

  // Dados dinâmicos calculados
  currentPrice = 0;
  currentDuration = 0;
  selectedOptions: any[] = [];

  // Data mínima para o calendário (hoje)
  minDate = new Date().toISOString();

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


  constructor(private storage: Storage, private router: Router, private api: ApiService, private route: ActivatedRoute, public authService: AuthService) {
    // Registrar ícones
    addIcons({informationCircleOutline,calendarOutline,timeOutline,personOutline});
  }

  async ngOnInit() {
    await this.storage.create();

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
            }
          } else if (param === 'labios') {
            const labiosProcedure = this.procedimentos.find(p => p.categoria === 'labios');
            if (labiosProcedure) {
              this.selectedProcedimento = labiosProcedure.id;
              this.selectedProfissional = 0; // Sempre resetar para "Sem preferência"
              this.setDefaultOptions();
            }
          } else if (this.procedimentos.length > 0) {
            this.selectedProcedimento = this.procedimentos[0].id;
            this.selectedProfissional = 0; // Sempre resetar para "Sem preferência"
            this.setDefaultOptions();
          }
        }
      },
      error: (err) => {
        console.error('Erro ao carregar procedimentos:', err);
      }
    });

    // Load professionals
    this.loadProfissionais();

    // Load user appointments to check for duplicates (only if logged in)
    if (this.authService.isAuthenticated) {
      this.loadMeusAgendamentos();
    }

    // Restaurar dados temporários se existirem (usuário retornou do login)
    this.restoreTemporaryAppointmentData();
  }

  private loadProfissionais(procedimentoId?: number) {
    console.log('🔄 Carregando profissionais para procedimento:', procedimentoId);
    this.api.getProfissionais(procedimentoId).subscribe({
      next: (res) => {
        if (res.success) {
          console.log('✅ Profissionais carregados:', res.profissionais);
          this.profissionais = res.profissionais;

          // Set default to "Sem preferência" (ID 0)
          this.selectedProfissional = 0;
        }
      },
      error: (err) => {
        console.error('❌ Erro ao carregar profissionais:', err);
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
        console.error('❌ Erro ao carregar meus agendamentos:', err);
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
        console.error('Erro ao restaurar dados temporários:', error);
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
      console.error('Erro ao formatar data:', error);
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
    const proc = this.procedimentos.find(p => p.id === this.selectedProcedimento);
    if (proc) {
      if (proc.categoria === 'cilios') {
        const firstCiliosType = this.getCiliosTypeOptions()[0];
        this.tipoCilios = firstCiliosType?.value || 'volume_brasileiro';
        this.corCilios = 'preto';
      } else if (proc.categoria === 'labios') {
        const firstLabiosCor = this.getLabiosCorOptions()[0];
        this.corLabios = firstLabiosCor?.value || 'ruby';
      } else if (proc.categoria === 'combo' || proc.id === 5) {
        const firstCombo = this.getComboOptions()[0];
        this.tipoCilios = firstCombo?.value || 'combo_preto';
        this.corCilios = 'preto';
        this.corLabios = 'ruby';
      }
    }
    this.calculatePriceAndDuration();
  }

  // Métodos para atualizar seleções e recalcular
  updateTipoCilios(valor: string) {
    this.tipoCilios = valor;
    this.calculatePriceAndDuration();
  }

  updateCorCilios(valor: string) {
    this.corCilios = valor;
    // Recalcular pois cor pode afetar preço
    this.calculatePriceAndDuration();
  }

  updateCorLabios(valor: string) {
    this.corLabios = valor;
    // Recalcular preço pois diferentes cores têm preços diferentes
    this.calculatePriceAndDuration();
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
    console.log('🔔 onDateChange CHAMADO!');

    if (!this.selectedDate) {
      console.log('❌ selectedDate está vazio!');
      return;
    }

    // Corrigir problema de fuso horário - usar apenas a parte da data
    const date = this.selectedDate.split('T')[0];

    console.log('=== DADOS DA REQUISIÇÃO ===');
    console.log('Data selecionada:', this.selectedDate);
    console.log('Data formatada:', date);
    console.log('Profissional:', this.selectedProfissional);
    console.log('Procedimento:', this.selectedProcedimento);
    console.log('=========================');

    this.api.getHorarios(date, this.selectedProfissional, this.selectedProcedimento).subscribe({
      next: (res) => {
        console.log('=== RESPOSTA DA API ===');
        console.log('Success:', res.success);
        console.log('Horarios:', res.horarios);
        console.log('Tipo de horarios:', typeof res.horarios);
        console.log('É array?:', Array.isArray(res.horarios));
        console.log('Resposta completa:', res);
        console.log('=====================');

        if (res.success) {
          if (res.horarios && Array.isArray(res.horarios) && res.horarios.length > 0) {
            this.horariosDisponiveis = res.horarios.map((h: any) => h.hora.substring(0, 5));
            console.log('✅ Horários carregados:', this.horariosDisponiveis.length, 'horários');
          } else {
            console.warn('⚠️ API retornou success: true, mas sem horários');
            this.horariosDisponiveis = [];
          }
        } else {
          console.warn('❌ API retornou success: false');
          console.warn('Mensagem:', res.message);
          this.horariosDisponiveis = [];
        }
      },
      error: (err) => {
        console.error('=== ERRO NA API ===');
        console.error('Erro completo:', err);
        console.error('Status:', err.status);
        console.error('Message:', err.message);
        console.error('Error:', err.error);
        console.error('==================');
        alert(`Erro ao buscar horários: ${err.message}`);
        this.horariosDisponiveis = [];
      }
    });
  }

  async setProcedimento(procedimentoId: number) {
    this.selectedProcedimento = procedimentoId;
    this.setDefaultOptions();
    this.calculatePriceAndDuration();
    await this.storage.set('selectedProcedimento', procedimentoId);

    // Resetar seleção de profissional antes de carregar novos
    this.selectedProfissional = 0;

    // Recarregar profissionais baseado no procedimento selecionado
    this.loadProfissionais(procedimentoId);
  }

  // Helper methods for template
  get selectedProcedimentoCategoria(): string {
    const proc = this.procedimentos.find(p => p.id === this.selectedProcedimento);
    return proc?.categoria || '';
  }

  get isCiliosSelected(): boolean {
    return this.selectedProcedimentoCategoria === 'cilios';
  }

  get isLabiosSelected(): boolean {
    return this.selectedProcedimentoCategoria === 'labios';
  }

  get isComboSelected(): boolean {
    return this.selectedProcedimentoCategoria === 'combo' || this.selectedProcedimento === 5;
  }

  get selectedProcedimentoOpcoes(): any[] {
    return this.opcoes[this.selectedProcedimento] || [];
  }

  getCiliosTypeOptions(): any[] {
    return this.selectedProcedimentoOpcoes.filter(opt => opt.tipo === 'cilios_tipo');
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
      // Para combo, pegar a opção específica selecionada
      const comboOpcao = opcoes.find(opt => opt.tipo === 'combo' && opt.value === this.tipoCilios);
      if (comboOpcao) {
        this.currentPrice = comboOpcao.preco_centavos || 0;
        this.currentDuration = comboOpcao.duracao || 0;
        this.selectedOptions = [comboOpcao];
      }
    }

    // Recalcular horários disponíveis se uma data já foi selecionada
    if (this.selectedDate) {
      this.onDateChange();
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

    // Para simplicidade, vamos permitir todos os horários que cabem no dia
    // Em uma implementação mais complexa, verificaríamos se há agendamentos conflitantes
    return false;
  }

  // Filtrar horários que não conflitam
  get horariosDisponiveisFiltrados(): string[] {
    console.log('🔍 Filtrando horários...');
    console.log('🔍 Horários disponíveis antes do filtro:', this.horariosDisponiveis);
    console.log('🔍 Duração do procedimento:', this.currentDuration);

    const filtered = this.horariosDisponiveis.filter(slot => {
      const conflict = this.conflictWithDuration(slot);
      console.log(`🔍 Horário ${slot} - Conflito: ${conflict}`);
      return !conflict;
    });

    console.log('🔍 Horários filtrados:', filtered);
    return filtered;
  }

  onSubmit() {
    if (!this.selectedProcedimento || !this.selectedDate || !this.selectedTime) {
      alert('Selecione procedimento, data e horário.');
      return;
    }

    if (this.selectedProfissional === null || this.selectedProfissional === undefined) {
      alert('Selecione um profissional ou escolha "Sem preferência" para agendamento automático.');
      return;
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
        alert('Nenhum profissional disponível para este horário. Tente outro horário.');
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
          alert(res?.message || 'Não foi possível criar o agendamento.');
        }
      },
      error: (err) => {
        alert(err?.error?.message || 'Erro ao comunicar com o servidor.');
      }
    });
  }
}
