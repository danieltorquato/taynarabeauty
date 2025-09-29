import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonIcon, IonChip } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { schoolOutline, timeOutline, cashOutline, sparklesOutline, informationCircleOutline } from 'ionicons/icons';

interface ProcedimentoDetalhe {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  duracao: string;
  preco: string;
  beneficios: string[];
  cuidados: string[];
  imagem: string;
}

@Component({
  selector: 'app-procedimento-detalhes',
  templateUrl: './procedimento-detalhes.page.html',
  styleUrls: ['./procedimento-detalhes.page.scss'],
  standalone: true,
  imports: [IonChip, IonIcon, IonButton, IonCardContent, IonCardTitle, IonCardHeader, IonCard, IonBackButton, IonButtons, IonTitle, IonToolbar, IonHeader, IonContent, CommonModule]
})
export class ProcedimentoDetalhesPage implements OnInit {
  procedimento: ProcedimentoDetalhe | null = null;

  // Banco de dados de procedimentos
  procedimentos: { [key: string]: ProcedimentoDetalhe } = {
    'volume-brasileiro': {
      id: 'volume-brasileiro',
      nome: 'Volume Brasileiro',
      categoria: 'Cílios',
      descricao: 'O Volume Brasileiro é uma técnica revolucionária que proporciona um olhar marcante e natural. Através da aplicação de múltiplos fios ultrafinos, criamos um efeito volumoso e elegante que valoriza a beleza natural dos seus olhos.',
      duracao: '2h30min',
      preco: 'R$ 160,00',
      beneficios: [
        'Olhar mais marcante e expressivo',
        'Efeito natural e harmonioso',
        'Durabilidade de até 4 semanas',
        'Resistente à água e oleosidade',
        'Dispensa o uso de rímel'
      ],
      cuidados: [
        'Evite molhar nas primeiras 24h',
        'Não use maquiagem à base de óleo',
        'Escove delicadamente os cílios',
        'Faça manutenção a cada 3-4 semanas'
      ],
      imagem: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&h=600&fit=crop'
    },
    'volume-ingles': {
      id: 'volume-ingles',
      nome: 'Volume Inglês',
      categoria: 'Cílios',
      descricao: 'O Volume Inglês é perfeito para quem busca um olhar dramático e sofisticado. Com a técnica de leques mais amplos, criamos um efeito de volume máximo mantendo a leveza e naturalidade.',
      duracao: '3h',
      preco: 'R$ 180,00',
      beneficios: [
        'Volume intenso e dramático',
        'Perfeito para ocasiões especiais',
        'Efeito duradouro',
        'Olhar de boneca sem perder a naturalidade',
        'Técnica exclusiva e diferenciada'
      ],
      cuidados: [
        'Evite molhar nas primeiras 24h',
        'Use produtos específicos para extensão de cílios',
        'Durma de barriga para cima se possível',
        'Retoque profissional a cada 3 semanas'
      ],
      imagem: 'https://images.unsplash.com/photo-1508186225823-0963cf9ab0de?w=800&h=600&fit=crop'
    },
    'fox-eyes': {
      id: 'fox-eyes',
      nome: 'Fox Eyes - Raposinha',
      categoria: 'Cílios',
      descricao: 'A técnica Fox Eyes, também conhecida como Raposinha, cria um olhar felino e alongado. É a tendência do momento, proporcionando um efeito lifting natural que alonga e eleva o olhar.',
      duracao: '3h',
      preco: 'R$ 180,00',
      beneficios: [
        'Efeito lifting natural',
        'Olhar alongado e felino',
        'Tendência internacional',
        'Valoriza o formato dos olhos',
        'Rejuvenesce o olhar'
      ],
      cuidados: [
        'Evite esfregar os olhos',
        'Use produtos sem óleo',
        'Escove diariamente com escovinha própria',
        'Manutenção recomendada a cada 3 semanas'
      ],
      imagem: 'https://images.unsplash.com/photo-1583001934227-49e0e8be5e00?w=800&h=600&fit=crop'
    },
    'hidragloss': {
      id: 'hidragloss',
      nome: 'Hidragloss - Lips',
      categoria: 'Lábios',
      descricao: 'O Hidragloss Lips é um tratamento inovador que hidrata profundamente e realça a cor natural dos lábios. Com pigmentos especiais, proporciona um efeito glossy e volumoso que dura semanas.',
      duracao: '1h',
      preco: 'R$ 130,00',
      beneficios: [
        'Hidratação profunda e duradoura',
        'Efeito glossy natural',
        'Realce da cor natural',
        'Lábios mais volumosos',
        'Duração de até 4 semanas'
      ],
      cuidados: [
        'Evite alimentos muito quentes nas primeiras 24h',
        'Use protetor labial com FPS',
        'Hidrate constantemente',
        'Evite esfoliação nos primeiros 7 dias'
      ],
      imagem: 'https://images.unsplash.com/photo-1515688594390-b649af70d282?w=800&h=600&fit=crop'
    },
    'lash-lifting': {
      id: 'lash-lifting',
      nome: 'Lash Lifting',
      categoria: 'Cílios',
      descricao: 'O Lash Lifting é um tratamento que levanta e curva seus próprios cílios naturais, criando um efeito de alongamento sem precisar de extensões. Perfeito para quem busca praticidade no dia a dia.',
      duracao: '2h',
      preco: 'R$ 150,00',
      beneficios: [
        'Valoriza os cílios naturais',
        'Efeito de curvatura natural',
        'Baixa manutenção',
        'Ideal para o dia a dia',
        'Duração de 6 a 8 semanas'
      ],
      cuidados: [
        'Não molhe por 24h',
        'Evite vapor e sauna por 48h',
        'Não use curvex',
        'Escove delicadamente'
      ],
      imagem: 'https://images.unsplash.com/photo-1552693673-1bf958298229?w=800&h=600&fit=crop'
    }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    addIcons({ schoolOutline, timeOutline, cashOutline, sparklesOutline, informationCircleOutline });
  }

  ngOnInit() {
    const procedimentoId = this.route.snapshot.paramMap.get('id');
    if (procedimentoId && this.procedimentos[procedimentoId]) {
      this.procedimento = this.procedimentos[procedimentoId];
    }
  }

  irParaCursos() {
    this.router.navigateByUrl('/cursos');
  }
}
