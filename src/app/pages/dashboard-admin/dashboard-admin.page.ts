import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonItem, IonLabel, IonInput, IonList } from '@ionic/angular/standalone';
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
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonItem, IonLabel, IonInput, IonList, CommonModule, FormsModule]
})
export class DashboardAdminPage implements OnInit {
  selectedDate = new Date().toISOString().split('T')[0];
  agendamentosData: any[] = [];
  timeSlots: TimeSlot[] = [];
  hasUnsavedChanges = false;
  pendingChanges: Array<{time: string, status: 'livre' | 'bloqueado'}> = [];

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.generateTimeSlots();
    this.loadAgendamentos();
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
}
