import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Trash2, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ProfileImageUploadProps {
  currentImage: string | null;
  userName: string;
  onImageUpdated?: (imageUrl: string) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showButtons?: boolean;
}

export default function ProfileImageUpload({
  currentImage,
  userName,
  onImageUpdated,
  size = 'md',
  showButtons = true
}: ProfileImageUploadProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Define o tamanho do avatar com base na prop size
  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
    xl: 'h-40 w-40'
  };

  // Obter iniciais do nome do usuário
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Função para abrir o seletor de arquivo
  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Função para fazer upload da imagem
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar o tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Tipo de arquivo não suportado',
        description: 'Por favor, selecione uma imagem (JPG, PNG, etc.)',
        variant: 'destructive'
      });
      return;
    }

    // Verificar o tamanho do arquivo (limite de 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 5MB',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsUploading(true);

      // Criar um objeto FormData para enviar o arquivo
      const formData = new FormData();
      formData.append('profileImage', file);

      // Enviar a requisição
      const response = await fetch('/api/profile-image/upload', {
        method: 'POST',
        body: formData,
        headers: {
          // Não incluir Content-Type pois o navegador define automaticamente com o boundary para FormData
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao fazer upload da imagem');
      }

      const data = await response.json();
      
      // Atualizar o cache da query para refletir a nova imagem
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // Notificar o componente pai sobre a mudança (se fornecido)
      if (onImageUpdated) {
        onImageUpdated(data.imageUrl);
      }

      toast({
        title: 'Imagem atualizada',
        description: 'Sua foto de perfil foi atualizada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast({
        title: 'Erro ao atualizar imagem',
        description: 'Não foi possível fazer o upload da imagem',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      // Limpar o input de arquivo para permitir que o mesmo arquivo seja selecionado novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Função para excluir a imagem de perfil
  const handleDeleteImage = async () => {
    if (!currentImage) return;

    try {
      setIsDeleting(true);

      const response = await apiRequest('DELETE', '/api/profile-image/delete');

      if (!response.ok) {
        throw new Error('Falha ao remover a imagem');
      }

      // Atualizar o cache da query para refletir a remoção da imagem
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // Notificar o componente pai sobre a mudança (se fornecido)
      if (onImageUpdated) {
        onImageUpdated('');
      }

      toast({
        title: 'Imagem removida',
        description: 'Sua foto de perfil foi removida com sucesso'
      });
    } catch (error) {
      console.error('Erro ao remover a imagem:', error);
      toast({
        title: 'Erro ao remover imagem',
        description: 'Não foi possível remover a foto de perfil',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Input de arquivo oculto */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Avatar clicável */}
      <div className="relative group">
        <Avatar 
          className={`${sizeClasses[size]} ring-4 ring-white shadow-md cursor-pointer transition-opacity duration-300 group-hover:opacity-80`}
          onClick={handleSelectFile}
        >
          <AvatarImage 
            src={currentImage || ""} 
            alt={userName} 
            className="object-cover"
          />
          <AvatarFallback className={`text-2xl bg-primary text-primary-foreground`}>
            {getInitials(userName)}
          </AvatarFallback>
          
          {/* Ícone de câmera sobreposto */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
            <Camera className="h-6 w-6 text-white" />
          </div>
        </Avatar>
      </div>

      {/* Botões de ação (somente se showButtons for true) */}
      {showButtons && (
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectFile}
            disabled={isUploading || isDeleting}
          >
            {isUploading ? (
              <>Enviando...</>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Alterar foto
              </>
            )}
          </Button>

          {currentImage && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteImage}
              disabled={isUploading || isDeleting}
              className="text-destructive hover:bg-destructive/10"
            >
              {isDeleting ? (
                <>Removendo...</>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}