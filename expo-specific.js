// Arquivo de configuração e adaptação para Expo Go
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import React from 'react';

// Em um projeto real, aqui importaríamos o componente principal da aplicação
// Por exemplo: import App from './client/src/App';

// Componente temporário para teste do Expo Go
const ExpoApp = () => {
  return (
    <View style={{
      flex: 1,
      backgroundColor: '#6C8EFF', // Azul Nevoeiro (cor primária)
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <Text style={{
        color: 'white',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center'
      }}>
        MindWell
      </Text>
      <Text style={{
        color: 'white',
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 30
      }}>
        Plataforma de saúde mental integrada e personalizada
      </Text>
      <Text style={{
        color: '#C3BFFF', // Lilás Névoa (cor secundária)
        fontSize: 16,
        textAlign: 'center'
      }}>
        Versão de teste no Expo Go
      </Text>
      <StatusBar style="light" />
    </View>
  );
};

// Registra o componente raiz para o Expo
registerRootComponent(ExpoApp);