import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-confirmacao',
  templateUrl: './confirmacao.page.html',
  styleUrls: ['./confirmacao.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent]
})
export class ConfirmacaoPage {
  id: number | null = null;
  nome = '';
  telefone = '';
  email = '';
  servico = '';
  data = '';
  hora = '';
  whatsapp = '';
  emailSent = false;
  profissionalNome = '';
  automaticConfirmation = false;
  accountCreated = false;

  constructor(private router: Router, private route: ActivatedRoute) {
    const nav = this.router.getCurrentNavigation();
    const state = (nav && nav.extras && nav.extras.state) as any;
    if (state) {
      this.id = state.id ?? null;
      this.nome = state.nome ?? '';
      this.telefone = state.telefone ?? '';
      this.email = state.email ?? '';
      this.servico = state.servico ?? '';
      this.data = state.data ?? '';
      this.hora = state.hora ?? '';
      this.whatsapp = state.whatsapp ?? '';
      this.emailSent = !!state.emailSent;
      this.profissionalNome = state.profissionalNome ?? '';
      this.automaticConfirmation = state.automaticConfirmation ?? false;
      this.accountCreated = state.accountCreated ?? false;
    } else {
      const qp = this.route.snapshot.queryParamMap;
      this.id = Number(qp.get('id')) || null;
      this.nome = qp.get('nome') || '';
      this.telefone = qp.get('telefone') || '';
      this.email = qp.get('email') || '';
      this.servico = qp.get('servico') || '';
      this.data = qp.get('data') || '';
      this.hora = qp.get('hora') || '';
      this.whatsapp = qp.get('whatsapp') || '';
      this.emailSent = qp.get('emailSent') === 'true';
    }
  }
}


