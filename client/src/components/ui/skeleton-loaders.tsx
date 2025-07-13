import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Componente Skeleton para a página de diário
 */
export const JournalEntrySkeleton: React.FC = () => {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-md" />
      </div>
      
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-2/3" />
      
      <div className="flex justify-between pt-2">
        <div className="flex space-x-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </div>
  );
};

/**
 * Componente Skeleton para a lista de mensagens de chat
 */
export const ChatMessagesSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 p-4">
      {/* Mensagem do sistema */}
      <div className="flex items-start space-x-2">
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-16 w-56 rounded-2xl rounded-tl-sm" />
        </div>
      </div>
      
      {/* Mensagem do usuário */}
      <div className="flex items-start space-x-2 flex-row-reverse space-x-reverse justify-start ml-auto">
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-40 rounded-2xl rounded-tr-sm" />
        </div>
      </div>
      
      {/* Resposta do assistente */}
      <div className="flex items-start space-x-2">
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-24 w-64 rounded-2xl rounded-tl-sm" />
        </div>
      </div>
      
      {/* Sugestões */}
      <div className="ml-10 flex space-x-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
};

/**
 * Componente Skeleton para o estado emocional
 */
export const EmotionalStateSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-center">
        <Skeleton className="h-40 w-40 rounded-full" />
      </div>
      
      <div className="space-y-2 text-center">
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
      
      <div className="space-y-2 pt-4">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
      </div>
      
      <div className="space-y-2 pt-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
};

/**
 * Componente Skeleton para a página de perfil
 */
export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-52" />
        </div>
      </div>
      
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
      
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
      
      <div className="space-y-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-24 w-full rounded-md" />
      </div>
      
      <Skeleton className="h-12 w-full rounded-md" />
    </div>
  );
};

/**
 * Componente Skeleton para listas, como terapeutas ou grupos
 */
export const ListItemsSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      ))}
    </div>
  );
};

/**
 * Componente Skeleton para o card da dica diária
 */
export const DailyTipSkeleton: React.FC = () => {
  return (
    <div className="p-4 border border-gray-200 rounded-xl shadow-sm space-y-3">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-20 w-full rounded-md" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
};

/**
 * Componente Skeleton para um cartão de conteúdo genérico
 */
export const ContentCardSkeleton: React.FC = () => {
  return (
    <div className="p-4 border border-gray-200 rounded-xl shadow-sm space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      
      <Skeleton className="h-32 w-full rounded-md" />
      
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      
      <div className="flex justify-between pt-2">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
};

/**
 * Skeleton para a página de agendamento
 */
export const ScheduleSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-8 w-32" />
      
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md" />
        ))}
      </div>
      
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <div className="w-14">
              <Skeleton className="h-6 w-14" />
            </div>
            <div className="flex-1">
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Container de esqueleto animado para usar enquanto carrega dados
 * @param children Esqueletos a renderizar
 * @param className Classes adicionais
 * @returns 
 */
export const SkeletonContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
  count?: number;
}> = ({ children, className = '', count = 1 }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="mb-4">
          {children}
        </div>
      ))}
    </div>
  );
};