// @ts-nocheck
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

function getTransportTypeAndIcon(category: string) {
    const lower = category.toLowerCase();

    if (lower.startsWith('s') || lower.startsWith('r') || lower === 'ic' || lower === 'ir') {
        return {
            type: 'Zug',
            icon: <Ionicons name="train" size={16} color="#fff" />,
            color: '#0066CC'
        };
    } else if (lower.startsWith('b')) {
        return {
            type: 'Bus',
            icon: <MaterialCommunityIcons name="bus" size={16} color="#fff" />,
            color: '#FF6B35'
        };
    } else if (lower.startsWith('t')) {
        return {
            type: 'Tram',
            icon: <MaterialCommunityIcons name="tram" size={16} color="#fff" />,
            color: '#28A745'
        };
    }

    return {
        type: 'Unbekannt',
        icon: <Ionicons name="help-circle" size={16} color="#fff" />,
        color: '#6C757D'
    };
}

export default function VerbindungDetailScreen() {
    const { connection } = useLocalSearchParams();
    const data = connection ? JSON.parse(connection as string) : null;

    console.log('Received data:', data);
    if (!data) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#ffffff', fontSize: 16 }}>Keine Verbindung gefunden.</Text>
            </View>
        );
    }

    // Filtere nur die Fahrtabschnitte (ohne walk)
    const journeySections = data.sections.filter(section => !section.walk);

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            style={styles.scrollView}
        >
            {journeySections.map((section, index) => {
                const departure = section.departure;
                const arrival = section.arrival;
                const journey = section.journey;

                const category = journey?.category || '';
                const { type, icon, color } = getTransportTypeAndIcon(category);

                return (
                    <View key={`section-group-${index}`}>
                        {/* Fahrtabschnitt */}
                        <View style={styles.legCard}>
                            <View style={styles.timeColumn}>
                                <Text style={styles.timeText}>{formatTime(departure.departure)}</Text>
                                <Text style={styles.timeText}>{formatTime(arrival.arrival)}</Text>
                            </View>

                            <View style={styles.centerColumn}>
                                <Text style={styles.stationText}>{departure.station.name}</Text>

                                {/* Transport Badge mit Icon */}
                                <View style={[styles.transportBadge, { backgroundColor: color }]}>
                                    {icon}
                                    <Text style={styles.transportText}>
                                        {category} {journey?.number}
                                    </Text>
                                </View>

                                <Text style={styles.operatorText}>{journey?.operator?.name}</Text>
                                <Text style={styles.stationText}>{arrival.station.name}</Text>
                            </View>

                            <View style={styles.platformColumn}>
                                <Text style={styles.platformText}>
                                    {departure.platform ? `Gleis ${departure.platform}` : ''}
                                </Text>
                                <Text style={styles.platformText}>
                                    {arrival.platform ? `Gleis ${arrival.platform}` : ''}
                                </Text>
                            </View>
                        </View>

                        {/* Umstieg (nur wenn nicht letzte Verbindung) */}
                        {index < journeySections.length - 1 && (
                            <View style={styles.walkCard}>
                                <View style={styles.walkContent}>
                                    <Text style={styles.walkTime}>1 min</Text>
                                    <View style={styles.walkInfo}>
                                        <Text style={styles.walkText}>Umstieg</Text>
                                        <Text style={styles.walkEmoji}>🚶‍♂️</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                );
            })}
        </ScrollView>
    );
}

const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const styles = StyleSheet.create({
    scrollView: {
        backgroundColor: '#1a1a1a',
    },
    container: {
        padding: 16,
        backgroundColor: '#1a1a1a',
        minHeight: '100%',
    },
    legCard: {
        backgroundColor: '#2d2d2d',
        padding: 20,
        borderRadius: 12,
        marginVertical: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#3d3d3d',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
        minHeight: 90,
    },
    walkCard: {
        backgroundColor: '#333333',
        padding: 12,
        borderRadius: 8,
        marginVertical: 4,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#444444',
    },
    walkContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    walkTime: {
        fontSize: 14,
        color: '#999999',
        width: 60,
        textAlign: 'center',
        fontWeight: '500',
    },
    walkInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 16,
    },
    walkText: {
        fontSize: 14,
        marginRight: 8,
        fontStyle: 'italic',
        color: '#999999',
        fontWeight: '500',
    },
    walkEmoji: {
        fontSize: 18,
    },
    timeColumn: {
        width: 70,
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    timeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        fontFamily: 'monospace',
    },
    centerColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
    },
    stationText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        textAlign: 'center',
    },
    transportBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginVertical: 4,
        marginTop: 20,
        alignSelf: 'center',
    },
    transportText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 4,
    },
    operatorText: {
        fontSize: 11,
        color: '#999999',
        textAlign: 'center',
        marginTop: 2,
    },
    platformColumn: {
        width: 70,
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    platformText: {
        fontSize: 12,
        color: '#cccccc',
        fontWeight: '500',
        textAlign: 'right',
    },
});