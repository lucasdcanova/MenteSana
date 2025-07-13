// Script para excluir todas as entradas do diário do usuário atual
// Para usar, copie e cole este script no console do navegador quando estiver na página de histórico do diário

async function deleteAllJournalEntries() {
  // Pega as entradas atuais
  const response = await fetch('/api/journal-entries/user', {
    headers: {
      'Authorization': localStorage.getItem('authToken')
    }
  });
  
  const result = await response.json();
  const entries = result.data;
  
  if (!entries || entries.length === 0) {
    console.log('Nenhuma entrada de diário encontrada para excluir.');
    return;
  }
  
  console.log(`Encontradas ${entries.length} entradas para excluir.`);
  
  // Função para excluir uma entrada
  async function deleteEntry(id) {
    try {
      const response = await fetch(`/api/journal/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': localStorage.getItem('authToken')
        }
      });
      
      if (response.status === 204 || response.status === 200) {
        console.log(`✅ Entrada ${id} excluída com sucesso`);
        return true;
      } else {
        console.error(`❌ Erro ao excluir entrada ${id}: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Erro ao excluir entrada ${id}:`, error);
      return false;
    }
  }
  
  // Exclui todas as entradas uma a uma
  let deletedCount = 0;
  for (const entry of entries) {
    console.log(`Excluindo entrada ${entry.id}: ${entry.title || 'Sem título'}`);
    const success = await deleteEntry(entry.id);
    if (success) deletedCount++;
  }
  
  console.log(`\n===== Resumo da operação =====`);
  console.log(`Total de entradas processadas: ${entries.length}`);
  console.log(`Entradas excluídas com sucesso: ${deletedCount}`);
  console.log(`Entradas com erro: ${entries.length - deletedCount}`);
  
  // Atualiza a página para mostrar as alterações
  if (deletedCount > 0) {
    console.log('Atualizando página em 3 segundos...');
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }
}

// Executa a função principal
deleteAllJournalEntries().catch(error => {
  console.error('Erro ao executar o script:', error);
});