import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Star, StarHalf } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

// Tipos de dados
interface TherapistReview {
  id: number;
  userId: number;
  therapistId: number;
  rating: number; // 0-50, sendo 10 = 1 estrela, 50 = 5 estrelas
  comment: string | null;
  createdAt: string;
  sessionId: number | null;
}

interface ReviewsProps {
  therapistId: number;
}

export function ReviewsSection({ therapistId }: ReviewsProps) {
  const [reviews, setReviews] = useState<TherapistReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(40); // Default 4 estrelas (40)
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Carregar avaliações do terapeuta
  useEffect(() => {
    async function fetchReviews() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/therapists/${therapistId}/reviews`);
        
        if (!response.ok) {
          throw new Error('Falha ao carregar avaliações');
        }
        
        const data = await response.json();
        setReviews(data);
      } catch (error) {
        console.error('Erro ao carregar avaliações:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as avaliações',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchReviews();
  }, [therapistId, toast]);

  // Enviar uma nova avaliação
  const submitReview = async () => {
    if (!user) {
      toast({
        title: 'Acesso negado',
        description: 'Você precisa estar logado para avaliar um terapeuta',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const reviewData = {
        rating,
        comment: comment.trim() || null
      };
      
      // Utilizar o token de autorização se disponível
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Se tivermos um token na sessão local, usar para autenticação
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await apiRequest('POST', `/api/therapists/${therapistId}/reviews`, reviewData);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao enviar avaliação');
      }
      
      const newReview = await response.json();
      
      // Adicionar a nova avaliação à lista
      setReviews(prevReviews => [newReview, ...prevReviews]);
      
      // Limpar o formulário
      setComment('');
      
      toast({
        title: 'Avaliação enviada',
        description: 'Sua avaliação foi registrada com sucesso',
        variant: 'default'
      });
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao enviar avaliação',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Renderizar estrelas com base na avaliação (0-50)
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating / 10);
    const hasHalfStar = rating % 10 >= 5;
    
    // Estrelas cheias
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} className="fill-yellow-400 text-yellow-400" />);
    }
    
    // Meia estrela se aplicável
    if (hasHalfStar) {
      stars.push(<StarHalf key="half" className="fill-yellow-400 text-yellow-400" />);
    }
    
    // Estrelas vazias para completar 5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="text-gray-300" />);
    }
    
    return stars;
  };

  // Média das avaliações
  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    return sum / reviews.length;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center mb-6 p-4 bg-emerald-50 rounded-lg">
        <h3 className="text-2xl font-semibold mb-2">Avaliações</h3>
        {reviews.length > 0 ? (
          <div className="flex flex-col items-center">
            <div className="flex items-center mb-2">
              {renderStars(calculateAverageRating())}
              <span className="ml-2 text-lg font-medium">
                {(calculateAverageRating() / 10).toFixed(1)}
              </span>
            </div>
            <p className="text-sm text-gray-500">{reviews.length} avaliação(ões)</p>
          </div>
        ) : (
          <p className="text-gray-500">Ainda não há avaliações</p>
        )}
      </div>

      {user && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Avaliar terapeuta</CardTitle>
            <CardDescription>Compartilhe sua experiência com este terapeuta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="rating">Avaliação</Label>
                <div className="flex gap-2">
                  {[10, 20, 30, 40, 50].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          rating >= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                <Label htmlFor="comment">Comentário (opcional)</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Compartilhe sua experiência com este terapeuta..."
                  className="min-h-[100px]"
                />
              </div>
              
              <Button 
                onClick={submitReview} 
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Comentários</h3>
        
        {isLoading ? (
          <div className="text-center py-6">
            <p>Carregando avaliações...</p>
          </div>
        ) : reviews.length > 0 ? (
          reviews.map((review) => (
            <Card key={review.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {renderStars(review.rating)}
                    <span className="ml-2 font-medium">
                      {(review.rating / 10).toFixed(1)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {format(new Date(review.createdAt), 'dd/MM/yyyy')}
                  </span>
                </div>
              </CardHeader>
              {review.comment && (
                <CardContent>
                  <p className="text-gray-700">{review.comment}</p>
                </CardContent>
              )}
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-gray-500">Não há avaliações para exibir</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}