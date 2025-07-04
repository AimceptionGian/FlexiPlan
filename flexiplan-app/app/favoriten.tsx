// @ts-nocheck
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { router, useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';

const FAVORITES_KEY = 'FLEXIPLAN_FAVORITES';

function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function FavoritenScreen() {
    const [favorites, setFavorites] = useState([]);

    useFocusEffect(
        useCallback(() => {
            const loadFavorites = async () => {
                const stored = await AsyncStorage.getItem(FAVORITES_KEY);
                if (stored) {
                    setFavorites(JSON.parse(stored));
                } else {
                    setFavorites([]);
                }
            };

            loadFavorites();
        }, [])
    );

    const handleDelete = async (connection: any) => {
        try {
            const updated = favorites.filter(
                (fav) => JSON.stringify(fav) !== JSON.stringify(connection)
            );
            await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
            setFavorites(updated);
        } catch (err) {
            console.error('Fehler beim Löschen des Favoriten:', err);
            Alert.alert('Fehler', 'Der Favorit konnte nicht gelöscht werden');
        }
    };

    const renderRightActions = (connection: any) => {
        return (
            <TouchableOpacity
                style={styles.deleteContainer}
                onPress={() => handleDelete(connection)}
            >
                <MaterialIcons name="delete" size={24} color="white" />
            </TouchableOpacity>
        );
    };

    const renderItem = ({ item }: any) => (
        <Swipeable
            renderRightActions={() => renderRightActions(item)}
            rightThreshold={40}
            containerStyle={styles.swipeableContainer}
        >
            <View style={styles.item}>
                <TouchableOpacity onPress={() => handlePress(item)}>
                    <Text style={styles.text}>
                        {item?.from?.station?.name} → {item?.to?.station?.name}
                    </Text>
                    <Text style={styles.subtext}>
                        {formatTime(item?.from?.departure)} – {formatTime(item?.to?.arrival)}
                    </Text>
                </TouchableOpacity>
            </View>
        </Swipeable>
    );

    const handlePress = (connection: any) => {
        router.push({
            pathname: '/verbindung/[id]',
            params: {
                id: "detail",
                connection: JSON.stringify(connection)
            },
        });
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={favorites}
                keyExtractor={(_, index) => index.toString()}
                renderItem={renderItem}
                ListEmptyComponent={<Text style={styles.empty}>Keine Favoriten</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1C1C1E', padding: 16 },
    swipeableContainer: {
        marginBottom: 10,
        borderRadius: 8,
        overflow: 'hidden',
    },
    item: {
        backgroundColor: '#2C2C2E',
        padding: 12,
        borderRadius: 8,
    },
    text: { color: '#fff', fontSize: 16 },
    subtext: { color: '#bbb', fontSize: 14, marginTop: 4 },
    empty: { color: '#888', textAlign: 'center', marginTop: 40 },
    deleteContainer: {
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        width: 70,
        marginLeft: 10,
        borderRadius: 8,
    },
});