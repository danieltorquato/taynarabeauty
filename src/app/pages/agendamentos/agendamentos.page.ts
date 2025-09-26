import { Component, OnInit } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { IonButton, IonLabel, IonItem, IonSelect, IonSelectOption, IonList, IonDatetime, IonChip, IonBackButton, IonContent, IonTitle, IonToolbar, IonHeader, IonButtons, IonIcon } from "@ionic/angular/standalone";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { addIcons } from 'ionicons';
import { calendarOutline, personOutline } from 'ionicons/icons';

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
  selectedProfissional: number = 0;
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


  constructor(private storage: Storage, private router: Router, private api: ApiService, private route: ActivatedRoute) {
    // Registrar ícones
    addIcons({personOutline,calendarOutline});
  }

  async ngOnInit() {
    // Enforce login
    const token = localStorage.getItem('auth_token');
    if (!token) {
      this.router.navigateByUrl('/login');
      return;
    }

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
              this.setDefaultOptions();
            }
          } else if (param === 'labios') {
            const labiosProcedure = this.procedimentos.find(p => p.categoria === 'labios');
            if (labiosProcedure) {
              this.selectedProcedimento = labiosProcedure.id;
              this.setDefaultOptions();
            }
          } else if (this.procedimentos.length > 0) {
            this.selectedProcedimento = this.procedimentos[0].id;
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
    if (this.selectedDate) {
      const date = new Date(this.selectedDate).toISOString().split('T')[0];
      console.log('📅 Buscando horários para data:', date, 'profissional:', this.selectedProfissional, 'procedimento:', this.selectedProcedimento);

      this.api.getHorarios(date, this.selectedProfissional, this.selectedProcedimento).subscribe({
        next: (res) => {
          if (res.success) {
            this.horariosDisponiveis = res.horarios.map((h: any) => h.hora.substring(0, 5));
            console.log('⏰ Horários carregados:', this.horariosDisponiveis);
          } else {
            console.warn('❌ API retornou success: false');
            this.horariosDisponiveis = [];
          }
        },
        error: (err) => {
          console.error('❌ Erro ao carregar horários:', err);
          alert(`❌ ERRO: ${err.message || 'Falha na comunicação'}`);
          this.horariosDisponiveis = [];
        }
      });
    }
  }

  async setProcedimento(procedimentoId: number) {
    this.selectedProcedimento = procedimentoId;
    this.setDefaultOptions();
    this.calculatePriceAndDuration();
    await this.storage.set('selectedProcedimento', procedimentoId);

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
    const filtered = this.horariosDisponiveis.filter(slot => !this.conflictWithDuration(slot));

    return filtered;
  }

  onSubmit() {
    if (!this.selectedProcedimento || this.selectedProfissional === null || this.selectedProfissional === undefined || !this.selectedDate || !this.selectedTime) {
      alert('Selecione procedimento, profissional, data e horário.');
      return;
    }

    const dateIso = this.selectedDate;
    const date = dateIso ? dateIso.slice(0, 10) : '';

    this.api.createAppointment({
      procedimento_id: this.selectedProcedimento,
      profissional_id: this.selectedProfissional,
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
