import { Component, OnInit } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { IonButton, IonLabel, IonItem, IonSelect, IonSelectOption, IonList, IonDatetime, IonChip, IonBackButton, IonContent, IonTitle, IonToolbar, IonHeader, IonButtons } from "@ionic/angular/standalone";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-agendamento',
  templateUrl: './agendamentos.page.html',
  styleUrls: ['./agendamentos.page.scss'],
  standalone: true,
  imports: [IonButtons, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonLabel, IonItem, IonSelect, IonSelectOption, IonList, IonDatetime, IonChip, IonBackButton, CommonModule, FormsModule]
})
export class AgendamentoPage implements OnInit {
  procedimentos: any[] = [];
  opcoes: any = {};
  selectedProcedimento: number = 0;
  selectedDate: string = '';
  selectedTime: string = '';
  note: string = '';
  tipoCilios: string = '';
  corCilios: string = '';
  corLabios: string = '';
  horariosDisponiveis: string[] = [];

  // Cores de cílios disponíveis
  cilioCores = [
    { id: 'preto', label: 'Preto', color: '#000000' },
    { id: 'marrom', label: 'Marrom', color: '#8B4513' }
  ];

  // Cores de lábios disponíveis
  labiosCores = [
    { id: 'rose', label: 'Rosé', color: '#ff8fb1' },
    { id: 'nude', label: 'Nude', color: '#e8b0a0' },
    { id: 'ruby', label: 'Ruby', color: '#cc2952' },
    { id: 'peach', label: 'Pêssego', color: '#ffb184' },
  ];

  constructor(private storage: Storage, private router: Router, private api: ApiService, private route: ActivatedRoute) {}

  async ngOnInit() {
    // Enforce login
    const token = localStorage.getItem('auth_token');
    if (!token) {
      this.router.navigateByUrl('/login');
      return;
    }

    await this.storage.create();

    // Load procedures from database
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
        this.tipoCilios = 'volume-brasileiro';
        this.corCilios = 'preto';
      } else if (proc.categoria === 'labios') {
        this.corLabios = 'rose';
      }
    }
  }

  onDateChange() {
    if (this.selectedDate) {
      const date = new Date(this.selectedDate).toISOString().split('T')[0];
      this.api.getHorarios(date).subscribe({
        next: (res) => {
          if (res.success) {
            this.horariosDisponiveis = res.horarios.map((h: any) => h.hora.substring(0, 5));
          }
        },
        error: (err) => {
          console.error('Erro ao carregar horários:', err);
        }
      });
    }
  }

  async setProcedimento(procedimentoId: number) {
    this.selectedProcedimento = procedimentoId;
    this.setDefaultOptions();
    await this.storage.set('selectedProcedimento', procedimentoId);
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
    return this.selectedProcedimentoCategoria === 'combo';
  }

  get selectedProcedimentoOpcoes(): any[] {
    return this.opcoes[this.selectedProcedimento] || [];
  }

  getCiliosTypeOptions(): any[] {
    return this.selectedProcedimentoOpcoes.filter(opt => opt.tipo === 'cilios_tipo');
  }

  getCiliosCorOptions(): any[] {
    return this.selectedProcedimentoOpcoes.filter(opt => opt.tipo === 'cilios_cor');
  }

  getLabiosCorOptions(): any[] {
    return this.selectedProcedimentoOpcoes.filter(opt => opt.tipo === 'labios_cor');
  }

  onSubmit() {
    if (!this.selectedProcedimento || !this.selectedDate || !this.selectedTime) {
      alert('Selecione procedimento, data e horário.');
      return;
    }

    const dateIso = this.selectedDate;
    const date = dateIso ? dateIso.slice(0, 10) : '';

    this.api.createAppointment({
      procedimento_id: this.selectedProcedimento,
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
