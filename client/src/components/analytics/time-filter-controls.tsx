import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimeFilterControlsProps {
  onFilterChange: (filters: {
    period: string;
    startDate: Date | null;
    endDate: Date | null;
    comparisonEnabled: boolean;
  }) => void;
}

export function TimeFilterControls({ onFilterChange }: TimeFilterControlsProps) {
  const [period, setPeriod] = useState("30d");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  
  // Formatação de datas em português
  const formatDate = (date: Date) => {
    return format(date, "dd 'de' MMMM, yyyy", { locale: ptBR });
  };
  
  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    
    // Resetar datas personalizadas quando mudar para períodos pré-definidos
    if (value !== "custom") {
      setStartDate(null);
      setEndDate(null);
    }
    
    onFilterChange({
      period: value,
      startDate: startDate,
      endDate: endDate,
      comparisonEnabled: comparisonEnabled
    });
  };
  
  const handleDateChange = (type: 'start' | 'end', date: Date | null) => {
    if (type === 'start') {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
    
    // Se ambas as datas estiverem definidas, automaticamente muda para período personalizado
    if (date && ((type === 'start' && endDate) || (type === 'end' && startDate))) {
      setPeriod("custom");
    }
    
    onFilterChange({
      period: (date && ((type === 'start' && endDate) || (type === 'end' && startDate))) ? "custom" : period,
      startDate: type === 'start' ? date : startDate,
      endDate: type === 'end' ? date : endDate,
      comparisonEnabled: comparisonEnabled
    });
  };
  
  const handleComparisonToggle = (value: string) => {
    const isEnabled = value === "enabled";
    setComparisonEnabled(isEnabled);
    
    onFilterChange({
      period,
      startDate,
      endDate,
      comparisonEnabled: isEnabled
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg border mb-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-6">
        <div>
          <label className="text-sm font-medium mb-1 block">Período</label>
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Selecionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="6m">Últimos 6 meses</SelectItem>
              <SelectItem value="1y">Último ano</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {period === "custom" && (
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Data inicial</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[140px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? formatDate(startDate) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate || undefined}
                    onSelect={(date) => handleDateChange('start', date)}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Data final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[140px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? formatDate(endDate) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate || undefined}
                    onSelect={(date) => handleDateChange('end', date)}
                    disabled={(date) => startDate ? date < startDate : false}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
        
        <div className="ml-auto">
          <label className="text-sm font-medium mb-1 block">Comparação</label>
          <Tabs 
            value={comparisonEnabled ? "enabled" : "disabled"} 
            onValueChange={handleComparisonToggle}
            className="w-[200px]"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="disabled">Desativada</TabsTrigger>
              <TabsTrigger value="enabled">Período anterior</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
}