import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import AvatarSelectionScreen from './src/screens/AvatarSelectionScreen';
import MainNavigator from './src/navigation/MainNavigator';
import GameScreen from './src/screens/GameScreen';
import PlayFriendsScreen from './src/screens/PlayFriendsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AvatarShopScreen from './src/screens/AvatarShopScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TableSelectionScreen from './src/screens/TableSelectionScreen';

import { COLORS } from './src/constants/theme';
import socketService from './src/services/socketService';
import UserAvatar from './src/components/UserAvatar';

const Stack = createStackNavigator();

export default function App() {
  const [challenge, setChallenge] = useState(null);
  const navigationRef = React.useRef();

  useEffect(() => {
    socketService.connect();

    socketService.on('receive_challenge', (data) => {
      setChallenge(data);
    });

    return () => {
      socketService.off('receive_challenge');
    };
  }, []);

  const handleAccept = async () => {
    if (challenge) {
      // Check Balance
      const amount = parseInt(challenge.amount);
      const userStr = await AsyncStorage.getItem('user'); // Need to import AsyncStorage
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.coins < amount) {
          alert(`Insufficient Funds. You have ${user.coins} coins.`);
          return;
        }
      }

      // Navigate to Game with roomCode
      const { roomCode, fromUser } = challenge;
      setChallenge(null);
      if (navigationRef.current) {
        navigationRef.current.navigate('Game', {
          mode: 'multiplayer',
          roomCode,
          opponent: fromUser,
          betAmount: amount
        });
      }
    }
  };

  const handleDecline = () => {
    setChallenge(null);
  };

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {/* Auth Flow */}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="AvatarSelection" component={AvatarSelectionScreen} />

            {/* Main App Flow */}
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Screen name="Game" component={GameScreen} />
            <Stack.Screen name="PlayFriends" component={PlayFriendsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="AvatarShop" component={AvatarShopScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="TableSelection" component={TableSelectionScreen} />
          </Stack.Navigator>

        </NavigationContainer>

        {/* Global Challenge Modal */}
        {challenge && (
          <Modal transparent animationType="slide" visible={!!challenge}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.title}>New Challenge!</Text>

                <UserAvatar avatarId={challenge.fromUser.avatarId} size={80} />
                <Text style={styles.name}>{challenge.fromUser.gamingName}</Text>
                <Text style={styles.amount}>wants to play for {challenge.amount} 🪙</Text>

                <View style={styles.btnRow}>
                  <TouchableOpacity onPress={handleDecline} style={[styles.btn, styles.declineBtn]}>
                    <Text style={styles.btnText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleAccept} style={[styles.btn, styles.acceptBtn]}>
                    <Text style={styles.btnText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: COLORS.bgDark2, padding: 30, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: COLORS.glassBorder },
  title: { color: COLORS.text, fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  name: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  amount: { color: '#FFD700', fontSize: 16, marginBottom: 20 },
  btnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btn: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  declineBtn: { backgroundColor: 'rgba(255,100,100,0.2)' },
  acceptBtn: { backgroundColor: COLORS.success },
  btnText: { color: '#FFF', fontWeight: 'bold' }
});
