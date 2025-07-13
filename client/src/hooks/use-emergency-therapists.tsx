import { useQuery } from "@tanstack/react-query";

interface EmergencyTherapist {
  id: number;
  firstName: string;
  lastName: string;
  imageUrl: string | null;
  specialization: string;
  rating: number | null;
  reviewCount?: number;
  hourlyRate: number | null;
  availability?: {
    status: 'available' | 'busy' | 'offline';
    nextSlot?: Date;
  };
}

export function useEmergencyTherapists() {
  const {
    data: emergencyTherapists = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<EmergencyTherapist[]>({
    queryKey: ['/api/available-therapists-for-urgent'],
    retry: 2,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Refetch every 30 seconds to keep availability status updated
  });

  // Adiciona propriedades padrão aos terapeutas para compatibilidade com o componente
  const formattedTherapists = emergencyTherapists.map(therapist => ({
    ...therapist,
    reviewCount: therapist.reviewCount || 0,
    rating: therapist.rating || 4.5,
    hourlyRate: therapist.hourlyRate || 100,
    emergencyReady: true,
    availability: therapist.availability || {
      status: 'available' as const
    }
  }));

  return {
    emergencyTherapists: formattedTherapists,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching: false, // Add this property to track refetching state
  };
}