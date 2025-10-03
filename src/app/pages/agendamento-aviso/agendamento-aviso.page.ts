import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personAddOutline, logInOutline, calendarOutline, timeOutline, personOutline, checkmarkCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-agendamento-aviso',
  templateUrl: './agendamento-aviso.page.html',
  styleUrls: ['./agendamento-aviso.page.scss'],
  standalone: true,
  imports: [IonIcon, IonButton, IonBackButton, IonButtons, IonTitle, IonToolbar, IonHeader, IonContent, CommonModule]
})
export class AgendamentoAvisoPage implements OnInit {
  appointmentData: any = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {
    addIcons({
      personAddOutline,
      logInOutline,
      calendarOutline,
      timeOutline,
      personOutline,
      checkmarkCircleOutline
    });
  }

  ngOnInit() {
    // Recuperar dados do agendamento do localStorage
    this.loadAppointmentData();
  }

  private loadAppointmentData() {
    const savedData = localStorage.getItem('tempAppointmentData');
    if (savedData) {
      try {
        const appointmentData = JSON.parse(savedData);
        this.appointmentData = {
          procedimento: this.getProcedimentoName(appointmentData.selectedProcedimento),
          data: this.formatDate(appointmentData.selectedDate),
          hora: appointmentData.selectedTime,
          profissional: this.getProfissionalName(appointmentData.selectedProfissional)
        };
      } catch (error) {
        console.error('Erro ao carregar dados do agendamento:', error);
      }
    }
  }

  private getProcedimentoName(procedimentoId: number): string {
    // Mapear IDs para nomes dos procedimentos
    const procedimentos: { [key: number]: string } = {
      1: 'Alongamento de Cílios',
      2: 'Design de Lábios',
      3: 'Combo Cílios + Lábios',
      4: 'Volume Brasileiro',
      5: 'Volume Inglês'
    };
    return procedimentos[procedimentoId] || 'Procedimento';
  }

  private getProfissionalName(profissionalId: number): string {
    if (profissionalId === 0) {
      return 'Sem preferência';
    }
    // Aqui você poderia buscar o nome do profissional na API
    return 'Profissional';
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      return dateString;
    }
  }

  goToCreateAccount() {
    // Redirecionar para página de criação de conta
    this.router.navigate(['/criar-conta'], {
      queryParams: {
        returnUrl: '/agendamentos',
        message: 'Crie sua conta para confirmar o agendamento'
      }
    });
  }

  goToLogin() {
    // Redirecionar para página de login
    this.router.navigate(['/login'], {
      queryParams: {
        returnUrl: '/agendamentos',
        message: 'Faça login para confirmar seu agendamento'
      }
    });
  }
}
