import { useEffect, useState } from "react";
import { Bell, Loader2, X, Check } from "lucide-react";
import { 
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger 
} from "@/components/ui/drawer";
import { 
  useQuery, 
  useMutation,
  useQueryClient 
} from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Notification } from "@shared/schema";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 640px)");
  
  // Fetch notifications
  const { 
    data: notifications = [], 
    isLoading,
    error 
  } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: !!user, // Only fetch if user is logged in
    select: (data: Notification[]) => {
      // Convert string timestamps to Date objects
      return data.map(notification => ({
        ...notification,
        createdAt: new Date(notification.createdAt)
      }));
    }
  });
  
  // Connect to WebSocket for real-time notifications
  useEffect(() => {
    if (!user) return;
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      // Identify this connection with the current user
      socket.send(JSON.stringify({
        type: 'identify',
        userId: user.id
      }));
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'notification') {
        // Invalidate query to refetch notifications
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        
        // Show toast notification
        toast({
          title: data.notification?.title || "Nova notificação",
          description: data.notification?.message || "Você recebeu uma nova notificação",
        });
      }
    };
    
    return () => {
      socket.close();
    };
  }, [user, queryClient, toast]);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/notifications/${id}/read`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Não foi possível marcar a notificação como lida. Tente novamente.",
        variant: "destructive",
      });
    }
  });
  
  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/notifications/read-all");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Não foi possível marcar todas as notificações como lidas. Tente novamente.",
        variant: "destructive",
      });
    }
  });
  
  const markAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };
  
  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };
  
  // Notification content
  const NotificationContent = () => (
    <>
      {isLoading ? (
        <div className="p-4 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="p-4 text-center text-red-500">
          Erro ao carregar notificações
        </div>
      ) : notifications.length > 0 ? (
        notifications.map((notification) => (
          <div 
            key={notification.id}
            className={`p-3 border-b ${!notification.read ? 'bg-primary/10' : ''}`}
          >
            <div className="flex justify-between items-start">
              <h4 className="font-medium text-slate-800">{notification.title}</h4>
              <div className="flex items-center">
                <span className="text-xs text-slate-600 mr-2">
                  {notification.createdAt instanceof Date 
                    ? notification.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                </span>
                {!notification.read && (
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    onClick={() => markAsRead(notification.id)}
                    className="h-6 w-6 p-0 rounded-full"
                  >
                    <Check className="h-4 w-4 text-primary" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
            {notification.type && (
              <span className="inline-block px-2 py-1 mt-2 bg-slate-100 text-xs rounded-full text-slate-600">
                {notification.type === 'appointment' && 'Consulta'}
                {notification.type === 'exercise' && 'Exercício'}
                {notification.type === 'feedback' && 'Feedback'}
              </span>
            )}
          </div>
        ))
      ) : (
        <div className="p-4 text-center text-slate-600">
          Sem notificações
        </div>
      )}
    </>
  );
  
  // Mobile drawer UI
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <button className="rounded-full bg-white p-2 relative shadow-sm">
            <Bell className="h-5 w-5 text-slate-800" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500"></span>
            )}
          </button>
        </DrawerTrigger>
        <DrawerContent className="px-0 pb-0">
          <DrawerHeader className="px-4 pb-3 pt-4 flex items-center justify-between border-b">
            <DrawerTitle>Notificações</DrawerTitle>
            <div className="flex items-center">
              {unreadCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={markAllAsRead}
                  disabled={markAllAsReadMutation.isPending}
                  className="mr-3 text-xs h-8"
                >
                  {markAllAsReadMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Marcar tudo como lido"
                  )}
                </Button>
              )}
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          <ScrollArea className="h-[70vh]" enableMouseWheel={true}>
            <NotificationContent />
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }
  
  // Desktop popover UI
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="rounded-full bg-white p-2 relative shadow-sm">
          <Bell className="h-5 w-5 text-slate-800" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500"></span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex justify-between items-center p-3 border-b">
          <h3 className="font-semibold text-slate-800">Notificações</h3>
          {unreadCount > 0 && (
            <button 
              className="text-xs text-slate-600 hover:underline"
              onClick={markAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              {markAllAsReadMutation.isPending ? (
                <div className="flex items-center">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Processando...
                </div>
              ) : (
                "Marcar todas como lidas"
              )}
            </button>
          )}
        </div>
        
        <div className="max-h-80 overflow-auto">
          <NotificationContent />
        </div>
        
        {notifications.length > 0 && (
          <div className="p-2 text-center border-t">
            <button className="text-sm text-primary font-medium hover:underline">
              Ver todas
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
