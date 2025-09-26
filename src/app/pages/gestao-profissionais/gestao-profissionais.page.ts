import { Component, OnInit } from '@angular/core';
import { IonButton, IonLabel, IonItem, IonInput, IonSelect, IonSelectOption, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon, IonChip, IonAlert, IonToast, IonContent, IonButtons, IonToolbar, IonHeader, IonTitle, IonCheckbox } from "@ionic/angular/standalone";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { addIcons } from 'ionicons';
import { personAddOutline, createOutline, trashOutline, checkmarkOutline, closeOutline, cameraOutline } from 'ionicons/icons';

@Component({
  selector: 'app-gestao-profissionais',
  templateUrl: './gestao-profissionais.page.html',
  styleUrls: ['./gestao-profissionais.page.scss'],
  standalone: true,
  imports: [IonCheckbox, IonTitle, IonHeader, IonToolbar, IonButtons, IonContent, IonButton, IonLabel, IonItem, IonInput, IonSelect, IonSelectOption, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon, IonChip, CommonModule, FormsModule]
})
export class GestaoProfissionaisPage implements OnInit {
  profissionais: any[] = [];
  usuarios: any[] = [];
  procedimentos: any[] = [];
  opcoesCombo: any = {};

  // Formulário de novo profissional
  novoProfissional = {
    nome: '',
    usuario_id: null,
    ativo: true,
    competencias: [] as number[],
    opcoesCombo: [] as string[], // Para armazenar opções específicas do combo
    foto: ''
  };

  // Formulário de edição
  editandoProfissional: any = null;

  // Estados
  isModalOpen = false;
  isEditMode = false;

  constructor(private api: ApiService, private router: Router) {
    addIcons({personAddOutline,createOutline,trashOutline,closeOutline,cameraOutline,checkmarkOutline});
  }

  async ngOnInit() {
    await this.carregarDados();
  }

  async carregarDados() {
    // Carregar profissionais
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

    // Carregar usuários
    this.api.getUsuarios().subscribe({
      next: (res) => {
        if (res.success) {
          this.usuarios = res.usuarios;
        }
      },
      error: (err) => {
        console.error('Erro ao carregar usuários:', err);
      }
    });

    // Carregar procedimentos
    this.api.getProcedimentos().subscribe({
      next: (res) => {
        if (res.success) {
          this.procedimentos = res.procedimentos;
          this.opcoesCombo = res.opcoes || {};
        }
      },
      error: (err) => {
        console.error('Erro ao carregar procedimentos:', err);
      }
    });
  }

  abrirModalNovo() {
    this.isEditMode = false;
    this.novoProfissional = {
      nome: '',
      usuario_id: null,
      ativo: true,
      competencias: [],
      opcoesCombo: [],
      foto: ''
    };
    this.isModalOpen = true;
  }

  abrirModalEdicao(profissional: any) {
    this.isEditMode = true;
    this.editandoProfissional = { ...profissional };
    this.novoProfissional = {
      nome: profissional.nome,
      usuario_id: profissional.usuario_id,
      ativo: profissional.ativo,
      competencias: profissional.competencias || [],
      opcoesCombo: profissional.opcoesCombo || [],
      foto: profissional.foto || ''
    };
    this.isModalOpen = true;
  }

  fecharModal() {
    this.isModalOpen = false;
    this.editandoProfissional = null;
  }

  toggleCompetencia(procedimentoId: number) {
    const index = this.novoProfissional.competencias.indexOf(procedimentoId);
    if (index > -1) {
      this.novoProfissional.competencias.splice(index, 1);
    } else {
      this.novoProfissional.competencias.push(procedimentoId);
    }
  }

  temCompetencia(procedimentoId: number): boolean {
    return this.novoProfissional.competencias.includes(procedimentoId);
  }

  salvarProfissional() {
    if (this.isEditMode) {
      this.atualizarProfissional();
    } else {
      this.criarProfissional();
    }
  }

  criarProfissional() {
    this.api.criarProfissional(this.novoProfissional).subscribe({
      next: (res) => {
        if (res.success) {
          this.carregarDados();
          this.fecharModal();
        }
      },
      error: (err) => {
        console.error('Erro ao criar profissional:', err);
      }
    });
  }

  atualizarProfissional() {
    this.api.atualizarProfissional(this.editandoProfissional.id, this.novoProfissional).subscribe({
      next: (res) => {
        if (res.success) {
          this.carregarDados();
          this.fecharModal();
        }
      },
      error: (err) => {
        console.error('Erro ao atualizar profissional:', err);
      }
    });
  }

  excluirProfissional(profissional: any) {
    if (confirm(`Tem certeza que deseja excluir ${profissional.nome}?`)) {
      this.api.excluirProfissional(profissional.id).subscribe({
        next: (res) => {
          if (res.success) {
            this.carregarDados();
          }
        },
        error: (err) => {
          console.error('Erro ao excluir profissional:', err);
        }
      });
    }
  }

  getCompetenciasTexto(profissional: any): string {
    if (!profissional.competencias || profissional.competencias.length === 0) {
      return 'Nenhuma competência';
    }

    const nomes = profissional.competencias.map((id: number) => {
      const proc = this.procedimentos.find(p => p.id === id);
      return proc ? proc.nome : `ID ${id}`;
    });

    return nomes.join(', ');
  }

  getCompetenciaNome(procedimentoId: number): string {
    const proc = this.procedimentos.find(p => p.id === procedimentoId);
    return proc ? proc.nome : `ID ${procedimentoId}`;
  }

  getUsuarioNome(usuarioId: number): string {
    const usuario = this.usuarios.find(u => u.id === usuarioId);
    return usuario ? usuario.nome : 'Usuário não encontrado';
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.novoProfissional.foto = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  triggerImageUpload() {
    const fileInput = document.getElementById('imageUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  getImageUrl(profissional: any): string {
    if (profissional.foto) {
      return profissional.foto;
    }
    // Fotos padrão baseadas no ID
    if (profissional.id == 1) {
      return 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face';
    } else if (profissional.id == 2) {
      return 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face';
    }
    return 'https://via.placeholder.com/150x150/f28cb4/ffffff?text=' + encodeURIComponent(profissional.nome.charAt(0));
  }

  // Novos métodos para gestão de competências por categoria
  getProcedimentosPorCategoria(categoria: string): any[] {
    return this.procedimentos.filter(p => p.categoria === categoria);
  }

  temCompetenciaCombo(): boolean {
    return this.novoProfissional.competencias.some(id => {
      const proc = this.procedimentos.find(p => p.id === id);
      return proc && proc.categoria === 'combo';
    });
  }

  getOpcoesCombo(tipo: string): any[] {
    const comboId = this.procedimentos.find(p => p.categoria === 'combo')?.id;
    if (!comboId || !this.opcoesCombo[comboId]) {
      return [];
    }
    return this.opcoesCombo[comboId].filter((opcao: any) => opcao.tipo === tipo);
  }

  temOpcaoCombo(value: string): boolean {
    return this.novoProfissional.opcoesCombo.includes(value);
  }

  toggleOpcaoCombo(value: string, tipo: string) {
    const index = this.novoProfissional.opcoesCombo.indexOf(value);
    if (index > -1) {
      this.novoProfissional.opcoesCombo.splice(index, 1);
    } else {
      this.novoProfissional.opcoesCombo.push(value);
    }
  }

  formatarPreco(centavos: number): string {
    if (!centavos) return '';
    return `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;
  }
}
