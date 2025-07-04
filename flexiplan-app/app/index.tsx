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
  StatusBar
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

const getStandort = useCallback(async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Standortzugriff wurde verweigert.');
    return null;
  }

  const location = await Location.getCurrentPositionAsync({});
  return location.coords; // { latitude, longitude }
}, []);


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
      const response = await fetch(
        `https://transport.opendata.ch/v1/connections?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=${apiPage}`
      );
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

    const standort = await getStandort();
    if (!standort) {
      alert('Standort konnte nicht ermittelt werden.');
      return;
    }

    console.log('Aktueller Standort:', standort); // später wichtig für Laufzeitberechnung

    loadConnections('later', true);
  }, [from, to]);


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
    const temp = from;
    setFrom(to);
    setTo(temp);
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

  const handleSwipe = async (connection: Connection) => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      const currentFavorites = stored ? JSON.parse(stored) : [];

      // Doppelte vermeiden (optional)
      const exists = currentFavorites.some((fav: Connection) =>
        JSON.stringify(fav) === JSON.stringify(connection)
      );
      if (exists) return;

      const updated = [...currentFavorites, connection];
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      console.log('Favorit gespeichert!');
    } catch (err) {
      console.error('Fehler beim Speichern des Favoriten:', err);
    }
  };

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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.searchSection}>
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <Ionicons name="radio-button-on" size={16} color="#fff" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Von"
              placeholderTextColor="#999"
              value={from}
              onChangeText={setFrom}
            />
          </View>
          <View style={styles.inputRow}>
            <Ionicons name="location" size={16} color="#fff" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nach"
              placeholderTextColor="#999"
              value={to}
              onChangeText={setTo}
            />
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

          return (
            <Swipeable
              friction={2}
              leftThreshold={80}
              overshootLeft={false}
              renderLeftActions={renderLeftActions}
              onSwipeableLeftOpen={() => handleSwipe(item)}
            >
              <TouchableOpacity onPress={() => handlePress(item)}>
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
  swapButton: {
    backgroundColor: '#3A3A3C',
    borderRadius: 20,
    padding: 8,
    marginLeft: 12,
    marginBottom: 50,
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
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    marginBottom: 12,
  },
});
