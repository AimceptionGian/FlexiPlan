// @ts-nocheck
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { router, useRouter } from 'expo-router';

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

    const renderItem = ({ item }: any) => (
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
    );

    const handlePress = (connection: Connection) => {
        router.push({
            pathname: '/verbindung/[id]',
            params: {
                id: "detail", // Platzhalter-Wert (wird in [id].tsx ignoriert)
                connection: JSON.stringify(connection)
            },
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Favoriten</Text>
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
    title: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
    item: {
        backgroundColor: '#2C2C2E',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    text: { color: '#fff', fontSize: 16 },
    subtext: { color: '#bbb', fontSize: 14, marginTop: 4 },
    empty: { color: '#888', textAlign: 'center', marginTop: 40 },
});
function handlePress(item: any): void {
    throw new Error('Function not implemented.');
}

