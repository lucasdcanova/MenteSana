import React from 'react';

interface CorrelationMatrixProps {
  data: {
    factors: string[];
    matrix: number[][];
  }
}

export function CorrelationMatrix({ data }: CorrelationMatrixProps) {
  // Função para determinar a cor da célula baseada no valor de correlação
  const getCellColor = (value: number) => {
    // Cor para correlação positiva (0 a 1): verde
    if (value > 0) {
      const intensity = Math.min(value, 1) * 255;
      const green = 235 - intensity * 0.7;
      return `rgba(0, ${green}, ${120 + (intensity * 0.5)}, ${0.2 + value * 0.8})`;
    }
    // Cor para correlação negativa (-1 a 0): vermelho
    else {
      const intensity = Math.min(Math.abs(value), 1) * 255;
      const red = 235 - intensity * 0.7;
      return `rgba(${red}, 0, 0, ${0.2 + Math.abs(value) * 0.8})`;
    }
  };

  // Função para formatar o valor de correlação
  const formatCorrelation = (value: number) => {
    return value.toFixed(2);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 border text-sm font-medium bg-gray-50"></th>
            {data.factors.map((factor, index) => (
              <th key={index} className="p-2 border text-sm font-medium bg-gray-50 whitespace-nowrap">
                {factor}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.factors.map((rowFactor, rowIndex) => (
            <tr key={rowIndex}>
              <th className="p-2 border text-sm font-medium bg-gray-50 whitespace-nowrap">
                {rowFactor}
              </th>
              {data.matrix[rowIndex].map((value, colIndex) => (
                <td 
                  key={colIndex}
                  className="p-2 border text-center text-sm relative"
                  style={{ backgroundColor: getCellColor(value) }}
                >
                  <span className={`font-medium ${Math.abs(value) > 0.5 ? 'text-white' : 'text-gray-900'}`}>
                    {formatCorrelation(value)}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="mt-6 flex justify-center items-center">
        <div className="flex items-center space-x-8">
          <div className="flex items-center">
            <div className="w-4 h-4 mr-2" style={{ backgroundColor: getCellColor(-1) }}></div>
            <span className="text-sm">Forte correlação negativa (-1.0)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-2" style={{ backgroundColor: getCellColor(0) }}></div>
            <span className="text-sm">Sem correlação (0.0)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-2" style={{ backgroundColor: getCellColor(1) }}></div>
            <span className="text-sm">Forte correlação positiva (1.0)</span>
          </div>
        </div>
      </div>
    </div>
  );
}