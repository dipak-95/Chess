import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { Crown } from 'lucide-react-native';

import { login, signup } from '../services/authService';
import { Alert } from 'react-native';
import AppBackground from '../components/AppBackground';

export default function LoginScreen() {
    const navigation = useNavigation();
    const [isLogin, setIsLogin] = useState(true);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [gamingName, setGamingName] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleAuth = async () => {
        setIsLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
                navigation.replace('Main');
            } else {
                await signup(gamingName, email, password);
                navigation.replace('AvatarSelection');
            }
        } catch (error) {
            Alert.alert('Error', error.response?.data?.msg || error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AppBackground>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>

                {/* Logo Area */}
                <View style={styles.logoContainer}>
                    <Crown color={COLORS.primary} size={80} />
                    <Text style={styles.title}>CHESS MASTER</Text>
                    <Text style={styles.subtitle}>Play. Compete. Conquer.</Text>
                </View>

                {/* Auth Form */}
                <View style={styles.formContainer}>
                    <Text style={styles.headerText}>{isLogin ? 'Welcome Back!' : 'Create Account'}</Text>

                    {!isLogin && (
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Gaming Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Unique ID"
                                placeholderTextColor={COLORS.textDim}
                                value={gamingName}
                                onChangeText={setGamingName}
                            />
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email"
                            placeholderTextColor={COLORS.textDim}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor={COLORS.textDim}
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>

                    <TouchableOpacity onPress={handleAuth} style={styles.button} disabled={isLoading}>
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.secondary]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={styles.gradientButton}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color={COLORS.text} />
                            ) : (
                                <Text style={styles.buttonText}>{isLogin ? 'LOGIN' : 'SIGN UP'}</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchContainer}>
                        <Text style={styles.switchText}>
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <Text style={styles.linkText}>{isLogin ? 'Sign Up' : 'Login'}</Text>
                        </Text>
                    </TouchableOpacity>

                </View>
            </KeyboardAvoidingView>
        </AppBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'center',
        padding: SIZES.padding,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: 10,
        letterSpacing: 1,
    },
    subtitle: {
        color: COLORS.textDim,
        fontSize: 16,
        marginTop: 5,
    },
    formContainer: {
        backgroundColor: COLORS.glass,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        ...SHADOWS.medium,
    },
    headerText: {
        fontSize: 24,
        color: COLORS.text,
        marginBottom: 20,
        fontWeight: '600',
    },
    inputContainer: {
        marginBottom: 15,
    },
    label: {
        color: COLORS.textDim,
        fontSize: 12,
        marginBottom: 5,
        marginLeft: 5,
    },
    input: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 8,
        padding: 15,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    button: {
        marginTop: 10,
        borderRadius: SIZES.radius,
        overflow: 'hidden',
    },
    gradientButton: {
        paddingVertical: 15,
        alignItems: 'center',
    },
    buttonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    switchContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    switchText: {
        color: COLORS.textDim,
    },
    linkText: {
        color: COLORS.accent,
        fontWeight: 'bold',
    },
});
