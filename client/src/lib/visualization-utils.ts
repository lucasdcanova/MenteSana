/**
 * Utilidades para visualização 3D de entradas de diário
 */

// Mapa de cores para diferentes estados de humor
export const moodColors = {
  "muito-feliz": "#00FF00", // Verde brilhante
  "feliz": "#A1FF0A",       // Verde limão
  "neutro": "#FFFF00",      // Amarelo
  "triste": "#FFA500",      // Laranja
  "muito-triste": "#FF0000" // Vermelho
};

// Mapa de cores para diferentes categorias
export const categoryColors = {
  "trabalho": "#4287f5",      // Azul
  "relacionamentos": "#f542e9", // Rosa
  "saude": "#42f5a7",         // Verde turquesa
  "familia": "#f5ad42",        // Âmbar
  "financas": "#42f5e9",      // Ciano
  "educacao": "#9d42f5",      // Roxo
  "lazer": "#f54242",         // Vermelho
  "objetivos": "#f5f542",     // Amarelo
  "outros": "#a8a8a8"         // Cinza
};

// Função para interpolar cor com base no fator de intensidade
export function interpolateColor(color1: string, color2: string, factor: number): string {
  // Converte cores hexadecimais para RGB
  const hex2rgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  // Interpola entre dois valores
  const interpolate = (a: number, b: number, factor: number) => Math.round(a + (b - a) * factor);

  // Converte RGB para hexadecimal
  const rgb2hex = (rgb: number[]) => 
    "#" + rgb.map(x => x.toString(16).padStart(2, '0')).join('');

  const rgb1 = hex2rgb(color1);
  const rgb2 = hex2rgb(color2);
  
  const result = [
    interpolate(rgb1[0], rgb2[0], factor),
    interpolate(rgb1[1], rgb2[1], factor),
    interpolate(rgb1[2], rgb2[2], factor)
  ];
  
  return rgb2hex(result);
}

// Função para mapear valor de sentimento para posição no espaço 3D
export function mapSentimentToPosition(
  sentiment: { x: number, y: number, z: number }, 
  mood: string
): { position: [number, number, number], color: string } {
  // Garantir que os valores estejam dentro de limites razoáveis
  const x = Math.max(-5, Math.min(5, sentiment.x));
  const y = Math.max(-5, Math.min(5, sentiment.y));
  const z = Math.max(-5, Math.min(5, sentiment.z));
  
  // Determinar cor com base no humor
  const color = moodColors[mood as keyof typeof moodColors] || moodColors.neutro;
  
  return {
    position: [x, y, z],
    color
  };
}

// Gerar posição aleatória próxima a um ponto central
export function generateRandomPositionNear(
  center: [number, number, number], 
  radius: number
): [number, number, number] {
  const [cx, cy, cz] = center;
  
  // Gerar coordenadas aleatórias dentro de um raio
  const theta = Math.random() * 2 * Math.PI;
  const phi = Math.random() * Math.PI;
  const r = radius * Math.cbrt(Math.random()); // Distribuição uniforme em volume
  
  const x = cx + r * Math.sin(phi) * Math.cos(theta);
  const y = cy + r * Math.sin(phi) * Math.sin(theta);
  const z = cz + r * Math.cos(phi);
  
  return [x, y, z];
}

// Converter tag para tamanho e cor de partícula
export function tagToParticleProps(tag: string): { size: number; color: string } {
  // Função de hash simples para converter string em número
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };
  
  // Converter hash para cor HSL (mantendo saturação e luminosidade constantes)
  const hashToColor = (hash: number) => {
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 60%)`;
  };
  
  // Calcular tamanho com base no comprimento da tag (entre 0.05 e 0.2)
  const size = 0.05 + Math.min(0.15, tag.length * 0.01);
  
  // Gerar cor com base no hash da tag
  const color = hashToColor(hashCode(tag));
  
  return { size, color };
}