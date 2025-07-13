import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SelfHelpTool } from "@shared/schema";
import { ToolCard } from "@/components/self-help/tool-card";
import { 
  Loader2, Brain, Wind, Activity, Leaf, 
  Heart, BookmarkCheck, Sparkles, BrainCircuit, 
  Search, BookOpen, Clock, CheckCircle, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function SelfHelpPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toolsProgress, setToolsProgress] = useState<{[key: string]: number}>({});
  const { toast } = useToast();
  
  // Fetch all self-help tools
  const { data: tools, isLoading } = useQuery<SelfHelpTool[]>({
    queryKey: ["/api/self-help-tools", selectedCategory ? { category: selectedCategory } : {}],
  });
  
  // Simulate progress data (in a real app, this would come from the API)
  useEffect(() => {
    if (tools && tools.length > 0) {
      const mockProgress: {[key: string]: number} = {};
      tools.forEach(tool => {
        // Random progress between 0-100 for some tools
        if (Math.random() > 0.5) {
          mockProgress[tool.id] = Math.floor(Math.random() * 100);
        }
      });
      setToolsProgress(mockProgress);
    }
  }, [tools]);
  
  // Get all available categories with icons
  const categoriesWithIcons = [
    { name: "Meditação", icon: <Brain className="h-5 w-5" /> },
    { name: "Respiração", icon: <Wind className="h-5 w-5" /> },
    { name: "Mindfulness", icon: <Leaf className="h-5 w-5" /> },
    { name: "Grounding", icon: <Activity className="h-5 w-5" /> },
    { name: "Visualização", icon: <BrainCircuit className="h-5 w-5" /> },
    { name: "Relaxamento", icon: <Heart className="h-5 w-5" /> },
  ];
  
  // Get featured tool (first meditation tool or first available)
  const featuredTool = tools && tools.length > 0 
    ? tools.find(t => t.category.toLowerCase().includes("medit")) || tools[0] 
    : null;
  
  // Filter tools by selected category and search query
  const filteredTools = tools?.filter(tool => {
    // Filter by category if selected
    const categoryMatch = selectedCategory 
      ? tool.category === selectedCategory 
      : true;
    
    // Filter by search query if provided
    const searchMatch = searchQuery 
      ? tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.category.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    return categoryMatch && searchMatch;
  });
  
  // Calculate streaks and progress
  const totalCompleted = Object.keys(toolsProgress).length;
  const streakDays = 2; // Simulado, viria da API
  
  // Create user's saved tools
  const savedTools = tools && tools.length > 0 
    ? tools.filter(tool => Object.keys(toolsProgress).includes(tool.id.toString())).slice(0, 2)
    : [];

  // Function to get category icon
  const getCategoryIcon = (category: string) => {
    const foundCategory = categoriesWithIcons.find(
      c => c.name.toLowerCase() === category.toLowerCase()
    );
    return foundCategory?.icon || <BookOpen className="h-5 w-5" />;
  };

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      {/* Header */}
      <div className="bg-white pt-6 pb-5 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Ferramentas de Autoajuda</h1>
            <div className="flex items-center">
              <Badge 
                className="bg-primary/10 text-primary-dark border-0 font-semibold px-3 py-1 mr-3"
              >
                <Leaf className="h-4 w-4 mr-1.5" />
                {streakDays} dias consecutivos
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                className="border-primary text-primary hover:bg-primary/10"
                onClick={() => {
                  toast({
                    title: "Exercícios salvos",
                    description: "Acesse seus exercícios favoritos aqui",
                  });
                }}
              >
                <BookmarkCheck className="h-4 w-4 mr-1.5" />
                Salvos
              </Button>
            </div>
          </div>
          
          {/* Search bar */}
          <div className="relative mb-2">
            <Search className="h-5 w-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <Input 
              placeholder="Buscar exercícios para ansiedade, estresse, foco..." 
              className="pl-12 py-6 bg-white border border-gray-300 rounded-lg shadow-sm text-gray-900 font-medium text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 pt-6">
        {/* Progress overview */}
        {!selectedCategory && !searchQuery && (
          <Card className="mb-8 bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 text-lg">Seu progresso</h3>
                <div className="flex items-center bg-primary/10 px-3 py-1.5 rounded-full">
                  <CheckCircle className="h-4 w-4 text-primary mr-1.5" />
                  <span className="text-sm text-primary-dark font-semibold">
                    {totalCompleted} de {tools?.length || 0} exercícios
                  </span>
                </div>
              </div>
              <Progress 
                value={tools?.length ? (totalCompleted / tools.length) * 100 : 0} 
                className="h-3 mb-4 bg-gray-100" 
              />
              <p className="text-base text-gray-800">
                Praticar exercícios de autoajuda regularmente melhora seu bem-estar mental. 
                Continue com sua sequência diária para melhores resultados.
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Tool Categories */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Categorias</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              className={`h-auto py-4 flex flex-col items-center justify-center rounded-lg shadow-sm ${
                selectedCategory === null 
                  ? 'bg-primary hover:bg-primary-dark text-white' 
                  : 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-100'
              }`}
              onClick={() => setSelectedCategory(null)}
            >
              <BookOpen className="h-6 w-6 mb-2" />
              <span className="text-sm font-semibold">Todos</span>
            </Button>
            
            {categoriesWithIcons.map((category) => (
              <Button
                key={category.name}
                variant={selectedCategory === category.name ? "default" : "outline"}
                className={`h-auto py-4 flex flex-col items-center justify-center rounded-lg shadow-sm ${
                  selectedCategory === category.name 
                    ? 'bg-primary hover:bg-primary-dark text-white' 
                    : 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedCategory(category.name)}
              >
                {category.icon}
                <span className="text-sm font-semibold mt-2">{category.name}</span>
              </Button>
            ))}
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-base text-gray-700">Carregando exercícios...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Featured Tool */}
            {featuredTool && !selectedCategory && !searchQuery && (
              <div className="mb-10 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-3">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Recomendado para você hoje</h2>
                </div>
                
                <div className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-200">
                  <ToolCard tool={featuredTool} featured />
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Button 
                    variant="link" 
                    className="text-primary font-semibold hover:text-primary-dark"
                    onClick={() => {
                      toast({
                        title: "Mais recomendações",
                        description: "Veja mais exercícios recomendados para você",
                      });
                    }}
                  >
                    Ver mais recomendações
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}
            
            {/* Saved Tools */}
            {savedTools.length > 0 && !selectedCategory && !searchQuery && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <BookmarkCheck className="h-4 w-4 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Seus exercícios</h2>
                  </div>
                  <Button 
                    variant="link" 
                    className="text-primary font-semibold hover:text-primary-dark"
                    onClick={() => {
                      toast({
                        title: "Todos os exercícios salvos",
                        description: "Acesse todos os seus exercícios favoritos",
                      });
                    }}
                  >
                    Ver todos
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {savedTools.map((tool) => (
                    <div key={tool.id} className="relative bg-white rounded-lg overflow-hidden shadow-md border border-gray-200">
                      <ToolCard tool={tool} />
                      {toolsProgress[tool.id] && (
                        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
                          <div className="flex items-center justify-between text-xs mb-1 px-1">
                            <span className="text-gray-700 font-medium">Progresso</span>
                            <span className="text-primary font-semibold">{toolsProgress[tool.id]}%</span>
                          </div>
                          <Progress value={toolsProgress[tool.id]} className="h-2 bg-gray-100" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Main Tool Grid */}
            <div className="mb-10">
              <div className="flex items-center mb-5">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  {selectedCategory ? getCategoryIcon(selectedCategory) : <BookOpen className="h-4 w-4 text-green-600" />}
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedCategory ? `${selectedCategory}` : searchQuery ? "Resultados da pesquisa" : "Todos os exercícios"}
                </h2>
              </div>
              
              {filteredTools && filteredTools.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {filteredTools.map((tool, index) => (
                    <motion.div 
                      key={tool.id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-200"
                    >
                      <ToolCard tool={tool} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card className="bg-white p-8 flex flex-col items-center justify-center border border-gray-200 shadow-sm rounded-lg">
                  <Search className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-800 text-center font-semibold text-lg mb-2">
                    Nenhum exercício encontrado para "{searchQuery}".
                  </p>
                  <p className="text-gray-600 text-center mb-4">
                    Tente termos diferentes ou explore outras categorias.
                  </p>
                  <Button 
                    variant="outline" 
                    className="px-6 py-2 border-primary text-primary hover:bg-primary-light"
                    onClick={() => setSearchQuery("")}
                  >
                    Limpar pesquisa
                  </Button>
                </Card>
              )}
            </div>
            
            {/* Informação baseada em evidências */}
            {!selectedCategory && !searchQuery && (
              <Card className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 mb-8">
                <div className="flex items-start">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mr-4 flex-shrink-0">
                    <BookOpen className="h-6 w-6 text-purple-700" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3 text-lg">Baseado em evidências científicas</h4>
                    <p className="text-gray-800">
                      As técnicas apresentadas nesta seção são baseadas em estudos científicos e são
                      recomendadas por profissionais de saúde mental para auxiliar no manejo do estresse,
                      ansiedade e bem-estar geral.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 px-2.5 py-1">Redução de Estresse</Badge>
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 px-2.5 py-1">Melhoria do Sono</Badge>
                      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 px-2.5 py-1">Alívio da Ansiedade</Badge>
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 px-2.5 py-1">Foco e Concentração</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
