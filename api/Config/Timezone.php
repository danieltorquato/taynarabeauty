<?php
// Configuração de timezone para o sistema
// Este arquivo deve ser incluído em todos os scripts que usam datas

// Forçar timezone do Brasil
date_default_timezone_set('America/Sao_Paulo');

// Verificar se a configuração foi aplicada
if (date_default_timezone_get() !== 'America/Sao_Paulo') {
    error_log('AVISO: Não foi possível configurar timezone para America/Sao_Paulo. Timezone atual: ' . date_default_timezone_get());
}
?>
