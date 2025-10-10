// Arquivo de correção específica para problemas do combo em produção
// Este arquivo contém funções auxiliares para garantir que o combo funcione corretamente

export class ComboFixHelper {

  // Verifica se um objeto é válido e tem as propriedades necessárias
  static isValidOption(option: any): boolean {
    return option &&
           typeof option === 'object' &&
           option.tipo === 'combo_completo' &&
           option.id_tipo_cilios &&
           option.id_cor_cilios &&
           option.id_cor_labios &&
           option.label;
  }

  // Extrai dados de forma segura de um label
  static extractLabelParts(label: string): string[] {
    try {
      if (!label || typeof label !== 'string') {
        return [];
      }
      return label.split(' + ').map(part => part.trim()).filter(part => part.length > 0);
    } catch (error) {
      return [];
    }
  }

  // Verifica se os dados da API estão no formato esperado
  static validateApiData(procedimentos: any[], opcoes: any): boolean {
    try {
      if (!Array.isArray(procedimentos) || !opcoes || typeof opcoes !== 'object') {
        return false;
      }

      // Verificar se há pelo menos um procedimento de combo
      const hasCombo = procedimentos.some(proc =>
        proc &&
        (proc.categoria === 'combo' ||
         (proc.nome && proc.nome.toLowerCase().includes('combo')))
      );

      if (!hasCombo) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Cria uma opção de combo de forma segura
  static createComboOption(option: any): any {
    try {
      if (!this.isValidOption(option)) {
        return null;
      }

      const parts = this.extractLabelParts(option.label);
      if (parts.length < 3) {
        return null;
      }

      return {
        id: option.id,
        id_tipo_cilios: option.id_tipo_cilios,
        id_cor_cilios: option.id_cor_cilios,
        id_cor_labios: option.id_cor_labios,
        label: option.label,
        preco_centavos: option.preco_centavos || 0,
        duracao: option.duracao || 0,
        tipo: option.tipo
      };
    } catch (error) {
      return null;
    }
  }

  // Filtra opções de combo de forma segura
  static filterComboOptions(opcoes: any[]): any[] {
    try {
      if (!Array.isArray(opcoes)) {
        return [];
      }

      return opcoes
        .filter(opt => this.isValidOption(opt))
        .map(opt => this.createComboOption(opt))
        .filter(opt => opt !== null);
    } catch (error) {
      return [];
    }
  }
}
