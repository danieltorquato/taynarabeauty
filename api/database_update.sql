-- Script para adicionar coluna telefone obrigatória na tabela usuarios
-- Execute este script no banco de dados MySQL

-- Verificar se a coluna telefone existe
SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'taynara_beauty'
AND TABLE_NAME = 'usuarios'
AND COLUMN_NAME = 'telefone';

-- Adicionar coluna telefone se não existir
ALTER TABLE usuarios
ADD COLUMN telefone VARCHAR(20) NOT NULL DEFAULT '11999999999'
AFTER email;

-- Atualizar registros existentes que possam ter telefone NULL
UPDATE usuarios
SET telefone = '11999999999'
WHERE telefone IS NULL OR telefone = '';

-- Verificar a estrutura final da tabela
DESCRIBE usuarios;
