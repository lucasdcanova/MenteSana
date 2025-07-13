import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  Image, 
  TouchableOpacity,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Cores do MindWell
const COLORS = {
  primaryBlue: '#6C8EFF',  // Azul Nevoeiro
  secondaryPurple: '#C3BFFF', // Lilás Névoa
  supportGreen: '#A8E6CF',  // Verde Mentha
  darkGray: '#2F2F2F',
  mediumGray: '#666666',
  white: '#FFFFFF',
  lightGray: '#F8F9FA'
};

export default function App() {
  const [loading, setLoading] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // Checar conexão com o backend ao iniciar
  useEffect(() => {
    checkBackendConnection();
  }, []);

  // Função para tentar se conectar ao backend
  const checkBackendConnection = async () => {
    try {
      setConnectionStatus('checking');
      // Em um cenário real, usaríamos a URL do servidor real
      const response = await fetch('https://mindwell-backend.replit.app/api/health-check');
      
      // Simulamos uma resposta bem-sucedida para demonstração
      setConnectionStatus('connected');
    } catch (error) {
      console.log('Erro ao conectar com o backend:', error);
      setConnectionStatus('failed');
    }
  };

  // Rendereriza a tela Home
  const renderHomeScreen = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>MindWell</Text>
        </View>
      </View>
      
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeTitle}>Bem-vindo ao MindWell</Text>
        <Text style={styles.welcomeText}>
          Sua plataforma de saúde mental integrada e personalizada agora disponível no Expo Go para desenvolvimento.
        </Text>
      </View>

      <View style={styles.connectionStatusCard}>
        <Text style={styles.sectionTitle}>Status da Conexão</Text>
        <View style={styles.statusContainer}>
          {connectionStatus === 'checking' && (
            <>
              <ActivityIndicator size="small" color={COLORS.primaryBlue} />
              <Text style={styles.statusText}>Verificando conexão com o backend...</Text>
            </>
          )}
          
          {connectionStatus === 'connected' && (
            <>
              <View style={[styles.statusDot, { backgroundColor: COLORS.supportGreen }]} />
              <Text style={styles.statusText}>Conectado ao backend</Text>
            </>
          )}
          
          {connectionStatus === 'failed' && (
            <>
              <View style={[styles.statusDot, { backgroundColor: 'red' }]} />
              <Text style={styles.statusText}>Falha na conexão com o backend</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={checkBackendConnection}
              >
                <Text style={styles.retryButtonText}>Tentar novamente</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.sectionTitle}>Principais Funcionalidades</Text>
        
        <TouchableOpacity style={styles.featureCard}>
          <View style={[styles.featureIcon, { backgroundColor: COLORS.primaryBlue }]}>
            <Text style={styles.featureIconText}>📝</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Diário Emocional</Text>
            <Text style={styles.featureDescription}>
              Registre seus pensamentos e emoções com análise de IA
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.featureCard}>
          <View style={[styles.featureIcon, { backgroundColor: COLORS.secondaryPurple }]}>
            <Text style={styles.featureIconText}>👩‍⚕️</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Consultas Online</Text>
            <Text style={styles.featureDescription}>
              Conecte-se a terapeutas qualificados por videochamada
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.featureCard}>
          <View style={[styles.featureIcon, { backgroundColor: COLORS.supportGreen }]}>
            <Text style={styles.featureIconText}>🤖</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Assistente Virtual</Text>
            <Text style={styles.featureDescription}>
              Receba apoio do assistente alimentado por IA
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <View style={styles.versionInfo}>
        <Text style={styles.versionText}>MindWell - Versão Expo Go</Text>
        <Text style={styles.versionSubtext}>Desenvolvido com 💙</Text>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryBlue} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : (
        renderHomeScreen()
      )}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.darkGray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryBlue,
  },
  welcomeCard: {
    backgroundColor: COLORS.primaryBlue,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.white,
    lineHeight: 22,
  },
  connectionStatusCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    color: COLORS.mediumGray,
  },
  retryButton: {
    backgroundColor: COLORS.primaryBlue,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '500',
  },
  featuresContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureIconText: {
    fontSize: 22,
  },
  featureContent: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: COLORS.mediumGray,
    lineHeight: 20,
  },
  versionInfo: {
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 10,
  },
  versionText: {
    fontSize: 14,
    color: COLORS.mediumGray,
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    color: COLORS.mediumGray,
  },
});