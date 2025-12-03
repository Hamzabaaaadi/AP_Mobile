import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { driverApi, authService } from '../services/api';

const LoginScreen = ({ navigation, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez saisir votre email et mot de passe');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Erreur', 'Veuillez saisir une adresse email valide');
      return;
    }

    setLoading(true);
    try {
      const response = await driverApi.login(email, password);
      
      // Sauvegarde le token et les données du chauffeur
      await authService.saveToken(response.access_token);
      await authService.saveDriverData(response.driver);
      
      Alert.alert(
        'Connexion réussie',
        `Bienvenue ${response.driver.name}`,
        [{ text: 'OK', onPress: () => onLogin(response.driver) }]
      );

    } catch (error) {
      console.error('Erreur connexion:', error);
      
      let message = 'Erreur de connexion';
      if (error.response?.status === 401) {
        message = 'Email ou mot de passe incorrect';
      } else if (error.response?.data?.error) {
        message = error.response.data.error;
      } else if (!error.response) {
        message = 'Impossible de se connecter au serveur';
      }
      
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  const fillTestCredentials = () => {
    setEmail('jean.dupont@buscompany.com');
    setPassword('password123');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Ionicons name="bus" size={60} color="#2196F3" />
          </View>
          <Text style={styles.appName}>Bus Driver</Text>
          <Text style={styles.appTagline}>Application Chauffeur</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Connexion</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)}
              style={styles.passwordToggle}
            >
              <Ionicons 
                name={showPassword ? "eye-outline" : "eye-off-outline"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color="white" />
                <Text style={styles.loginButtonText}>Se connecter</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.registerLink}
            onPress={handleRegister}
          >
            <Text style={styles.registerText}>
              Pas encore de compte ? <Text style={styles.registerTextBold}>S'inscrire</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bouton pour les tests (à retirer en production) */}
        <TouchableOpacity 
          style={styles.testButton}
          onPress={fillTestCredentials}
        >
          <Text style={styles.testButtonText}>🧪 Utiliser les identifiants de test</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Version 1.0.0 • Bus Tracking System
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    backgroundColor: 'white',
    borderRadius: 40,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  appTagline: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  passwordToggle: {
    padding: 16,
  },
  loginButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#2196F3',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  registerLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 16,
    color: '#666',
  },
  registerTextBold: {
    color: '#2196F3',
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  testButtonText: {
    color: '#F57C00',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

export default LoginScreen;
