// @ts-nocheck
import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

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

const metersPerMinute = 80;

async function getStandort() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Standort', 'Standortzugriff wurde verweigert.');
    return null;
  }

  const location = await Location.getCurrentPositionAsync({});
  return location.coords; // { latitude, longitude }
}

// Funktion um Koordinaten in Adresse umzuwandeln
async function reverseGeocode(latitude: number, longitude: number) {
  try {
    const response = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (response.length > 0) {
      const address = response[0];
      return `${address.street || ''} ${address.streetNumber || ''}, ${address.city || ''}, ${address.country || ''}`.trim();
    }
  } catch (error) {
    console.error('Fehler beim Reverse Geocoding:', error);
  }
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

type Connection = {
  sections: any;
  from: {
    platform: any;
    departure: string;
    station: { name: string };
  };
  to: {
    arrival: string;
    station: { name: string };
  };
  duration: string;
};

export default function FahrplanScreen() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState({ earlier: false, later: false });
  const [page, setPage] = useState({ earlier: -1, later: 1 });
  const [hasMore, setHasMore] = useState({ earlier: true, later: true });
  const listRef = useRef<FlatList>(null);
  const router = useRouter();
  const [walkTime, setWalkTime] = useState('');

  // Neue States für Position und Zeit
  const [useCurrentPosition, setUseCurrentPosition] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ latitude: number, longitude: number } | null>(null);
  const [departureTime, setDepartureTime] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [isPositionAtDestination, setIsPositionAtDestination] = useState(false);

  // Funktion zum Setzen der aktuellen Position
  const handleUseCurrentPosition = async () => {
    try {
      const coords = await getStandort();
      if (coords) {
        setCurrentPosition(coords);
        setUseCurrentPosition(true);
        setIsPositionAtDestination(false);

        // Reverse Geocoding für bessere Anzeige
        const address = await reverseGeocode(coords.latitude, coords.longitude);
        setFrom(address);
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Position:', error);
      Alert.alert('Fehler', 'Position konnte nicht ermittelt werden.');
    }
  };

  // Funktion zum Setzen der aktuellen Position als Ziel
  const handleUseCurrentPositionAsDestination = async () => {
    try {
      const coords = await getStandort();
      if (coords) {
        setCurrentPosition(coords);
        setUseCurrentPosition(true);
        setIsPositionAtDestination(true);

        // Reverse Geocoding für bessere Anzeige
        const address = await reverseGeocode(coords.latitude, coords.longitude);
        setTo(address);
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Position:', error);
      Alert.alert('Fehler', 'Position konnte nicht ermittelt werden.');
    }
  };

  // Funktion zum Formatieren der aktuellen Zeit
  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // HH:MM Format
  };

  // Funktion zum Formatieren des aktuellen Datums
  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD Format
  };

  // Funktion zum Setzen der aktuellen Zeit
  const handleUseCurrentTime = () => {
    setDepartureTime(getCurrentTime());
    setDepartureDate(getCurrentDate());
  };

  const loadConnections = async (direction: 'earlier' | 'later', isInitialLoad = false) => {
    if ((!from || !to) && isInitialLoad) return;

    let pageNum = direction === 'earlier' ? page.earlier - 1 : page.later + 1;
    let apiPage = direction === 'earlier' ? pageNum : pageNum - 1;

    if (isInitialLoad) {
      setLoading(true);
      pageNum = 0;
      apiPage = 0;
    } else {
      setLoadingMore(prev => ({ ...prev, [direction]: true }));
    }

    try {
      // URL Parameter für die API erstellen
      let fromParam = from;
      let toParam = to;

      // Wenn aktuelle Position verwendet wird, Koordinaten verwenden
      if (useCurrentPosition && currentPosition) {
        if (isPositionAtDestination) {
          toParam = `${currentPosition.latitude},${currentPosition.longitude}`;
        } else {
          fromParam = `${currentPosition.latitude},${currentPosition.longitude}`;
        }
      }

      let apiUrl = `https://transport.opendata.ch/v1/connections?from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}&page=${apiPage}`;

      // Zeit und Datum hinzufügen, falls angegeben
      if (departureDate && departureTime) {
        const datetime = `${departureDate} ${departureTime}`;
        apiUrl += `&date=${encodeURIComponent(datetime)}`;
      }

      const response = await fetch(apiUrl);
      const data = await response.json();

      const now = new Date();

      const connectionsWithWartezeit = data.connections.map((conn: Connection) => {
        const departureTime = new Date(conn.from.departure);
        const wartezeitInMinuten = Math.round((departureTime.getTime() - now.getTime()) / 60000);

        return {
          ...conn,
          wartezeitInMinuten,
        };
      });

      const hatLangeWartezeit = connectionsWithWartezeit.some(
        conn => conn.wartezeitInMinuten > 5
      );

      if (hatLangeWartezeit) {
        console.log('Alternative Verbindungen sollten geprüft werden.');
        // Hier könnte später findeAlternativeVerbindungen(from, to, walkTime) aufgerufen werden
      }

      if (isInitialLoad) {
        setConnections(connectionsWithWartezeit || []);
        setPage({ earlier: -1, later: 1 });
        setHasMore({ earlier: true, later: true });
      } else {
        if (data.connections && data.connections.length > 0) {
          setConnections(prev =>
            direction === 'earlier'
              ? [...connectionsWithWartezeit, ...prev]
              : [...prev, ...connectionsWithWartezeit]
          );
          setPage(prev => ({
            earlier: direction === 'earlier' ? prev.earlier - 1 : prev.earlier,
            later: direction === 'later' ? prev.later + 1 : prev.later
          }));
        } else {
          setHasMore(prev => ({ ...prev, [direction]: false }));
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Verbindungen:', error);
      Alert.alert('Fehler', 'Verbindungen konnten nicht geladen werden.');
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setLoadingMore(prev => ({ ...prev, [direction]: false }));
      }
    }
  };

  const handleSearch = useCallback(async () => {
    if (!from || !to) return;
    Keyboard.dismiss();

    // Wenn aktuelle Position verwendet wird, aber noch nicht gesetzt ist
    if (useCurrentPosition && !currentPosition) {
      if (isPositionAtDestination) {
        await handleUseCurrentPositionAsDestination();
      } else {
        await handleUseCurrentPosition();
      }
    }

    loadConnections('later', true);
  }, [from, to, useCurrentPosition, currentPosition, departureTime, departureDate]);

  const loadEarlierConnections = useCallback(() => {
    if (!loading && !loadingMore.earlier && hasMore.earlier) {
      loadConnections('earlier');
    }
  }, [loading, loadingMore.earlier, hasMore.earlier]);

  const loadLaterConnections = useCallback(() => {
    if (!loading && !loadingMore.later && hasMore.later) {
      loadConnections('later');
    }
  }, [loading, loadingMore.later, hasMore.later]);

  const swapStations = () => {
    // Texte tauschen
    const temp = from;
    setFrom(to);
    setTo(temp);

    // Position-Status entsprechend anpassen
    if (useCurrentPosition) {
      setIsPositionAtDestination(!isPositionAtDestination);
    }
  };

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit'
    });

  const formatDuration = (duration: string) => {
    if (!duration) return '';
    const parts = duration.split(':');
    const dayMatch = parts[0].match(/(\d+)d(\d+)/);
    if (!dayMatch) return duration;
    const days = parseInt(dayMatch[1], 10);
    const hours = parseInt(dayMatch[2], 10);
    const minutes = parseInt(parts[1], 10);
    const totalHours = days * 24 + hours;
    return totalHours === 0 ? `${minutes} min` : `${totalHours} h ${minutes} min`;
  };

  const renderLeftActions = () => (
    <View style={styles.leftAction}>
      <Ionicons name="star" size={24} color="#fff" />
    </View>
  );

  const FAVORITES_KEY = 'FLEXIPLAN_FAVORITES';

  const handleSwipe = async (connection: Connection, swipeableRef: any) => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      const currentFavorites = stored ? JSON.parse(stored) : [];

      const existingIndex = currentFavorites.findIndex((fav: Connection) =>
        JSON.stringify(fav) === JSON.stringify(connection)
      );

      if (existingIndex !== -1) {
        const updated = [
          ...currentFavorites.slice(0, existingIndex),
          ...currentFavorites.slice(existingIndex + 1)
        ];
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
        console.log('Favorit entfernt!');
      } else {
        const updated = [...currentFavorites, connection];
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
        console.log('Favorit gespeichert!');
      }

      swipeableRef.close();
    } catch (err) {
      console.error('Fehler beim Bearbeiten der Favoriten:', err);
    }
  };

  const handlePress = (connection: Connection) => {
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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.searchSection}>
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <Ionicons name="radio-button-on" size={16} color="#fff" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, useCurrentPosition && !isPositionAtDestination && styles.inputDisabled]}
              placeholder="Von"
              placeholderTextColor="#999"
              value={from}
              onChangeText={(text) => {
                setFrom(text);
                if (useCurrentPosition && !isPositionAtDestination) {
                  setUseCurrentPosition(false);
                  setCurrentPosition(null);
                }
              }}
              editable={!(useCurrentPosition && !isPositionAtDestination)}
            />
            <TouchableOpacity
              style={[styles.positionButton, useCurrentPosition && !isPositionAtDestination && styles.positionButtonActive]}
              onPress={handleUseCurrentPosition}
            >
              <Ionicons name="location" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="location" size={16} color="#fff" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, useCurrentPosition && isPositionAtDestination && styles.inputDisabled]}
              placeholder="Nach"
              placeholderTextColor="#999"
              value={to}
              onChangeText={(text) => {
                setTo(text);
                if (useCurrentPosition && isPositionAtDestination) {
                  setUseCurrentPosition(false);
                  setCurrentPosition(null);
                }
              }}
              editable={!(useCurrentPosition && isPositionAtDestination)}
            />
            <TouchableOpacity
              style={[styles.positionButton, useCurrentPosition && isPositionAtDestination && styles.positionButtonActive]}
              onPress={handleUseCurrentPositionAsDestination}
            >
              <Ionicons name="location" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="time" size={16} color="#fff" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.timeInput]}
              placeholder="Datum (YYYY-MM-DD)"
              placeholderTextColor="#999"
              value={departureDate}
              onChangeText={setDepartureDate}
            />
            <TextInput
              style={[styles.input, styles.timeInput]}
              placeholder="Zeit (HH:MM)"
              placeholderTextColor="#999"
              value={departureTime}
              onChangeText={setDepartureTime}
            />
            <TouchableOpacity
              style={styles.nowButton}
              onPress={handleUseCurrentTime}
            >
              <Text style={styles.nowButtonText}>Jetzt</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="walk" size={16} color="#fff" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Max. Laufzeit (min)"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={walkTime}
              onChangeText={setWalkTime}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.swapButton} onPress={swapStations}>
          <Ionicons name="swap-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
        <Text style={styles.searchButtonText}>Verbindungen suchen</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#fff" style={styles.loader} />}

      <FlatList
        ref={listRef}
        data={connections}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const category = item.sections?.[0]?.journey?.category || '';
          const { type, icon, color } = getTransportTypeAndIcon(category);
          const platformLabel = type === 'Bus' ? 'Kante' : 'Gleis';
          let swipeableRef: any = null;

          return (
            <Swipeable
              ref={ref => { swipeableRef = ref; }}
              friction={2}
              leftThreshold={80}
              overshootLeft={false}
              renderLeftActions={renderLeftActions}
              onSwipeableLeftOpen={() => handleSwipe(item, swipeableRef)}
            >
              <TouchableOpacity
                onPress={() => handlePress(item)}
                activeOpacity={1}
                style={styles.touchableContainer}
              >
                <View style={styles.connectionCard}>
                  <View style={styles.connectionHeader}>
                    <View style={[styles.transportBadge, { backgroundColor: color }]}>
                      {icon}
                      <Text style={styles.transportText}>{category}</Text>
                    </View>
                    <Text style={styles.directionText}>Direction {item.to.station.name}</Text>
                  </View>

                  <View style={styles.timeContainer}>
                    <Text style={styles.departureTime}>{formatTime(item.from.departure)}</Text>
                    <View style={styles.progressLine}>
                      <View style={styles.progressBar} />
                      <View style={styles.progressDot} />
                    </View>
                    <Text style={styles.arrivalTime}>{formatTime(item.to.arrival)}</Text>
                  </View>

                  <View style={styles.connectionFooter}>
                    <Text style={styles.platformText}>
                      {platformLabel} {item.from.platform || 'N/A'}
                    </Text>
                    <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Swipeable>
          );
        }}
        onEndReached={loadLaterConnections}
        onScroll={({ nativeEvent }) => {
          if (nativeEvent.contentOffset.y <= 50 &&
            !loadingMore.earlier &&
            hasMore.earlier) {
            loadEarlierConnections();
          }
        }}
        scrollEventThrottle={16}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={loadingMore.earlier ? <ActivityIndicator style={styles.loadMoreIndicator} /> : null}
        ListFooterComponent={loadingMore.later ? <ActivityIndicator style={styles.loadMoreIndicator} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  searchSection: {
    backgroundColor: '#2C2C2E',
    margin: 16,
    marginTop: 60,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: { flex: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 8,
  },
  inputDisabled: {
    color: '#999',
  },
  timeInput: {
    flex: 1,
    marginRight: 8,
  },
  positionButton: {
    backgroundColor: '#3A3A3C',
    borderRadius: 16,
    padding: 8,
    marginLeft: 8,
  },
  positionButtonActive: {
    backgroundColor: '#007AFF',
  },
  nowButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
  },
  nowButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  swapButton: {
    backgroundColor: '#3A3A3C',
    borderRadius: 20,
    padding: 8,
    marginLeft: 12,
    marginBottom: 70,
  },
  searchButton: {
    backgroundColor: '#DC143C',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    paddingVertical: 12,
  },
  searchButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: { marginVertical: 20 },
  listContainer: { paddingHorizontal: 16 },
  touchableContainer: {
    flex: 1,
  },
  connectionCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  transportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  transportText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  directionText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  departureTime: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    minWidth: 60,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#48484A',
    marginHorizontal: 16,
    borderRadius: 1,
    position: 'relative',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  progressDot: {
    position: 'absolute',
    right: 0,
    top: -3,
    width: 8,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  arrivalTime: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
  connectionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  platformText: {
    color: '#fff',
    fontSize: 14,
  },
  durationText: {
    color: '#fff',
    fontSize: 14,
  },
  loadMoreIndicator: {
    marginVertical: 20,
  },
  leftAction: {
    width: 80,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 12,
  },
});